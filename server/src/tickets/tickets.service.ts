
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Ticket } from '../models/ticket.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Employee } from '../models/employee.model';
import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class TicketsService {
    constructor(
        @InjectModel(Ticket)
        private ticketModel: typeof Ticket,
        @InjectModel(Task)
        private taskModel: typeof Task,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectConnection()
        private sequelize: Sequelize,
        private tasksService: TasksService,
        private notificationsService: NotificationsService,
    ) { }

    async create(createTicketDto: any, userId: string) {
        return this.ticketModel.create({
            ...createTicketDto,
            createdById: userId,
            status: 'OPEN',
        });
    }

    async findAll() {
        return this.ticketModel.findAll({
            include: [
                { model: User, as: 'createdBy' },
                { model: Department, as: 'targetDepartment' },
                { model: Employee, as: 'assignedTo' },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string) {
        return this.ticketModel.findByPk(id, {
            include: [
                { model: User, as: 'createdBy' },
                { model: Department, as: 'targetDepartment' },
                { model: Employee, as: 'assignedTo' },
            ],
        });
    }

    async findByDepartment(departmentId: string) {
        return this.ticketModel.findAll({
            where: { targetDepartmentId: departmentId },
            include: [
                { model: User, as: 'createdBy' },
                { model: Employee, as: 'assignedTo' },
            ],
        });
    }

    async findByCreator(userId: string) {
        return this.ticketModel.findAll({
            where: { createdById: userId },
            include: [{ model: Department, as: 'targetDepartment' }],
        });
    }

    async assign(id: string, employeeId: string) {
        const ticket = await this.ticketModel.findByPk(id);
        if (!ticket) return null;

        // Idempotent: same employee already assigned
        if (ticket.getDataValue('status') === 'ACCEPTED' && ticket.getDataValue('assignedToId') === employeeId) {
            return this.findOne(id);
        }

        // Prevent double-assignment race condition
        if (ticket.getDataValue('status') !== 'OPEN') {
            throw new BadRequestException('Ticket is no longer open');
        }

        const ticketTitle = ticket.getDataValue('title');

        // Atomically update ticket status and create the linked task
        let taskCreated = false;
        await this.sequelize.transaction(async (t) => {
            await this.ticketModel.update(
                { assignedToId: employeeId, status: 'ACCEPTED' },
                { where: { id }, transaction: t },
            );

            const existingTask = await this.taskModel.findOne({
                where: { ticketId: id },
                transaction: t,
            });
            if (!existingTask) {
                await this.taskModel.create({
                    title: `[Ticket] ${ticketTitle}`,
                    description: ticket.getDataValue('description') || '',
                    state: 'ASSIGNED',
                    difficulty: 'MEDIUM',
                    assignedToId: employeeId,
                    startDate: new Date(),
                    ticketId: id,
                }, { transaction: t });
                taskCreated = true;
            }
        });

        // Notify assigned employee after commit
        if (taskCreated) {
            const employee = await this.employeeModel.findByPk(employeeId);
            if (employee?.getDataValue('userId')) {
                await this.notificationsService.create({
                    title: 'New task assigned',
                    body: `You have been assigned a new task: "[Ticket] ${ticketTitle}"`,
                    titleFr: 'Nouvelle tâche assignée',
                    bodyFr: `Une nouvelle tâche vous a été assignée : "[Ticket] ${ticketTitle}"`,
                    type: 'task',
                    userId: employee.getDataValue('userId'),
                });
            }
        }

        // Get employee name for ticket notification
        const employee = await this.employeeModel.findByPk(employeeId);
        const empName = employee
            ? `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`
            : 'An employee';

        await this.notifyTicketStakeholders(ticket, 'ACCEPTED', empName);

        return this.findOne(id);
    }

    async notifyTicketStakeholders(ticket: any, status: string, employeeName: string) {
        const ticketTitle = ticket.getDataValue('title');
        const creatorId = ticket.getDataValue('createdById');
        const deptId = ticket.getDataValue('targetDepartmentId');

        const STATUS_LABELS: Record<string, string> = {
            ACCEPTED: 'accepted',
            IN_PROGRESS: 'started working on',
            COMPLETED: 'completed',
        };
        const STATUS_LABELS_FR: Record<string, string> = {
            ACCEPTED: 'accepté',
            IN_PROGRESS: 'commencé à traiter',
            COMPLETED: 'résolu',
        };
        const action = STATUS_LABELS[status] || status.toLowerCase();
        const actionFr = STATUS_LABELS_FR[status] || status.toLowerCase();

        const notifications: { title: string; body: string; titleFr?: string; bodyFr?: string; type: string; userId: string }[] = [];

        // Notify ticket creator
        if (creatorId) {
            notifications.push({
                title: `Ticket ${status.toLowerCase()}: ${ticketTitle}`,
                body: `${employeeName} has ${action} your ticket "${ticketTitle}".`,
                titleFr: `Ticket ${status.toLowerCase()} : ${ticketTitle}`,
                bodyFr: `${employeeName} a ${actionFr} votre ticket "${ticketTitle}".`,
                type: 'ticket',
                userId: creatorId,
            });
        }

        // Notify HOD of the target department
        if (deptId) {
            const dept = await this.departmentModel.findByPk(deptId, {
                include: [{ model: Employee, as: 'head' }],
            });
            const head = dept?.getDataValue('head');
            const hodUserId = head?.getDataValue('userId');
            if (hodUserId && hodUserId !== creatorId) {
                notifications.push({
                    title: `Ticket ${status.toLowerCase()}: ${ticketTitle}`,
                    body: `${employeeName} has ${action} the ticket "${ticketTitle}".`,
                    titleFr: `Ticket ${status.toLowerCase()} : ${ticketTitle}`,
                    bodyFr: `${employeeName} a ${actionFr} le ticket "${ticketTitle}".`,
                    type: 'ticket',
                    userId: hodUserId,
                });
            }
        }

        if (notifications.length > 0) {
            await this.notificationsService.createMany(notifications);
        }
    }

    async updateStatus(id: string, status: string) {
        return this.ticketModel.update(
            { status },
            { where: { id } },
        );
    }

    async acceptForUser(ticketId: string, userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const ticket = await this.ticketModel.findByPk(ticketId);
        if (!ticket) throw new NotFoundException('Ticket not found');

        if (ticket.getDataValue('status') !== 'OPEN') {
            throw new BadRequestException('Ticket is not open');
        }

        const employeeDeptId = employee.getDataValue('departmentId');
        const ticketDeptId = ticket.getDataValue('targetDepartmentId');
        if (!employeeDeptId || employeeDeptId !== ticketDeptId) {
            throw new ForbiddenException('This ticket is not for your department');
        }

        return this.assign(ticketId, employee.getDataValue('id'));
    }

    async findByDepartmentAll(departmentId: string) {
        return this.ticketModel.findAll({
            where: { targetDepartmentId: departmentId },
            include: [
                { model: User, as: 'createdBy' },
                { model: Department, as: 'targetDepartment' },
                { model: Employee, as: 'assignedTo' },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async close(id: string) {
        const ticket = await this.ticketModel.findByPk(id);
        if (!ticket) throw new NotFoundException('Ticket not found');
        // Idempotent: already closed
        if (ticket.getDataValue('status') === 'CLOSED') {
            return this.ticketModel.findOne({ where: { id }, include: [{ model: User, as: 'createdBy' }, { model: Department, as: 'targetDepartment' }, { model: Employee, as: 'assignedTo' }] });
        }
        return this.ticketModel.update(
            { status: 'CLOSED', closedAt: new Date() },
            { where: { id }, returning: true },
        );
    }
}

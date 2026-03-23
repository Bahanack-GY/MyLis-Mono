
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Task } from '../models/task.model';
import { TaskHistory } from '../models/task-history.model';
import { Employee } from '../models/employee.model';
import { Ticket } from '../models/ticket.model';
import { Department } from '../models/department.model';
import { Team } from '../models/team.model';
import { Project } from '../models/project.model';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService, type GamificationResult } from '../gamification/gamification.service';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

const TASK_TO_TICKET_STATUS: Record<string, string> = {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
};

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task)
        private taskModel: typeof Task,
        @InjectModel(TaskHistory)
        private taskHistoryModel: typeof TaskHistory,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Ticket)
        private ticketModel: typeof Ticket,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectConnection()
        private sequelize: Sequelize,
        private notificationsService: NotificationsService,
        private gamificationService: GamificationService,
    ) { }

    async create(createTaskDto: any, createdByUserId?: string): Promise<Task> {
        const task = await this.taskModel.create({ ...createTaskDto, createdByUserId: createdByUserId || null });

        // Notify assigned employee about new task
        if (createTaskDto.assignedToId) {
            const employee = await this.employeeModel.findByPk(createTaskDto.assignedToId);
            if (employee && employee.userId) {
                await this.notificationsService.create({
                    title: 'New task assigned',
                    body: `You have been assigned a new task: "${task.getDataValue('title')}"`,
                    titleFr: 'Nouvelle tâche assignée',
                    bodyFr: `Une nouvelle tâche vous a été assignée : "${task.getDataValue('title')}"`,
                    type: 'task',
                    userId: employee.userId,
                });
            }
        }

        return task;
    }

    async findAll(departmentId?: string, from?: string, to?: string): Promise<Task[]> {
        const where: any = {};
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }
        const include: any[] = departmentId
            ? [{ model: Employee, as: 'assignedTo', where: { departmentId }, required: true }, { model: Team, as: 'assignedToTeam' }, Project]
            : [{ model: Employee, as: 'assignedTo' }, { model: Team, as: 'assignedToTeam' }, Project];
        return this.taskModel.findAll({ where, include });
    }

    async findOne(id: string): Promise<Task | null> {
        return this.taskModel.findByPk(id, {
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Team, as: 'assignedToTeam' },
                Project,
            ],
        });
    }

    async update(id: string, updateTaskDto: any): Promise<[number, Task[]]> {
        return this.taskModel.update(updateTaskDto, {
            where: { id },
            returning: true,
        });
    }

    async remove(id: string): Promise<void> {
        const task = await this.findOne(id);
        if (task) {
            await this.sequelize.transaction(async (t) => {
                await this.taskHistoryModel.destroy({ where: { taskId: id }, transaction: t });
                await task.destroy({ transaction: t });
            });
        }
    }

    async updateByUser(id: string, userId: string, role: string, dto: any): Promise<Task> {
        const task = await this.taskModel.findByPk(id, {
            include: [{ model: Employee, as: 'assignedTo' }],
        });
        if (!task) throw new NotFoundException('Task not found');

        const selfAssigned = task.getDataValue('selfAssigned');
        const isManagerOrHod = role === 'MANAGER' || role === 'HEAD_OF_DEPARTMENT';
        const isEmployee = role === 'EMPLOYEE';

        if (selfAssigned && isManagerOrHod) throw new ForbiddenException('Cannot edit a self-assigned task');
        if (!selfAssigned && isEmployee) throw new ForbiddenException('Cannot edit a task assigned by management');

        if (isEmployee) {
            const employee = await this.employeeModel.findOne({ where: { userId } });
            if (!employee || task.getDataValue('assignedToId') !== employee.id) {
                throw new ForbiddenException('Not your task');
            }
        }

        const editableFields = ['title', 'description', 'difficulty', 'startDate', 'endDate', 'dueDate', 'startTime'];
        const changes: Record<string, { from: any; to: any }> = {};
        for (const field of editableFields) {
            if (dto[field] !== undefined && dto[field] !== task.getDataValue(field)) {
                changes[field] = { from: task.getDataValue(field), to: dto[field] };
            }
        }

        // Collect notification data before entering transaction
        let notificationData: { title: string; body: string; titleFr: string; bodyFr: string; type: string; userId: string } | null = null;

        if (Object.keys(changes).length > 0) {
            let changedByName = userId;
            let employee: Employee | null = null;
            if (isManagerOrHod) {
                changedByName = `Manager (${role})`;
            } else {
                employee = await this.employeeModel.findOne({ where: { userId } });
                if (employee) changedByName = `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`;
            }

            await this.sequelize.transaction(async (t) => {
                await this.taskHistoryModel.create({
                    taskId: id,
                    changedByUserId: userId,
                    changedByName,
                    changes,
                }, { transaction: t });
                await task.update(dto, { transaction: t });
            });

            const taskTitle = task.getDataValue('title');
            if (isManagerOrHod) {
                const assignedTo = task.get('assignedTo') as any;
                const empUserId = assignedTo?.userId || assignedTo?.getDataValue?.('userId');
                if (empUserId) {
                    notificationData = {
                        title: 'Task updated',
                        body: `Your task "${taskTitle}" has been updated by management.`,
                        titleFr: 'Tâche mise à jour',
                        bodyFr: `Votre tâche "${taskTitle}" a été mise à jour par la direction.`,
                        type: 'task',
                        userId: empUserId,
                    };
                }
            } else {
                if (!employee) employee = await this.employeeModel.findOne({ where: { userId } });
                const deptId = employee?.getDataValue('departmentId');
                if (deptId) {
                    const dept = await this.departmentModel.findByPk(deptId, {
                        include: [{ model: Employee, as: 'head' }],
                    });
                    const hodUserId = dept?.getDataValue('head')?.getDataValue('userId');
                    if (hodUserId) {
                        const empName = `${employee!.getDataValue('firstName')} ${employee!.getDataValue('lastName')}`;
                        notificationData = {
                            title: 'Task edited',
                            body: `${empName} edited their task "${taskTitle}".`,
                            titleFr: 'Tâche modifiée',
                            bodyFr: `${empName} a modifié sa tâche "${taskTitle}".`,
                            type: 'task',
                            userId: hodUserId,
                        };
                    }
                }
            }
        } else {
            await task.update(dto);
        }

        if (notificationData) await this.notificationsService.create(notificationData);

        return task.reload({ include: [{ model: Employee, as: 'assignedTo' }, Project] });
    }

    async removeByUser(id: string, userId: string, role: string): Promise<void> {
        const task = await this.taskModel.findByPk(id, {
            include: [{ model: Employee, as: 'assignedTo' }],
        });
        if (!task) throw new NotFoundException('Task not found');

        const selfAssigned = task.getDataValue('selfAssigned');
        const isManagerOrHod = role === 'MANAGER' || role === 'HEAD_OF_DEPARTMENT';
        const isEmployee = role === 'EMPLOYEE';

        if (selfAssigned && isManagerOrHod) throw new ForbiddenException('Cannot delete a self-assigned task');
        if (!selfAssigned && isEmployee) throw new ForbiddenException('Cannot delete a task assigned by management');

        if (isEmployee) {
            const employee = await this.employeeModel.findOne({ where: { userId } });
            if (!employee || task.getDataValue('assignedToId') !== employee.id) {
                throw new ForbiddenException('Not your task');
            }
        }

        const taskTitle = task.getDataValue('title');

        if (isManagerOrHod) {
            const assignedTo = task.get('assignedTo') as any;
            const empUserId = assignedTo?.userId || assignedTo?.getDataValue?.('userId');
            if (empUserId) {
                await this.notificationsService.create({
                    title: 'Task deleted',
                    body: `Your task "${taskTitle}" has been deleted by management.`,
                    titleFr: 'Tâche supprimée',
                    bodyFr: `Votre tâche "${taskTitle}" a été supprimée par la direction.`,
                    type: 'task',
                    userId: empUserId,
                });
            }
        } else {
            const employee = await this.employeeModel.findOne({ where: { userId } });
            const deptId = employee?.getDataValue('departmentId');
            if (deptId) {
                const dept = await this.departmentModel.findByPk(deptId, {
                    include: [{ model: Employee, as: 'head' }],
                });
                const hodUserId = dept?.getDataValue('head')?.getDataValue('userId');
                if (hodUserId) {
                    const empName = `${employee!.getDataValue('firstName')} ${employee!.getDataValue('lastName')}`;
                    await this.notificationsService.create({
                        title: 'Task deleted',
                        body: `${empName} deleted their task "${taskTitle}".`,
                        titleFr: 'Tâche supprimée',
                        bodyFr: `${empName} a supprimé sa tâche "${taskTitle}".`,
                        type: 'task',
                        userId: hodUserId,
                    });
                }
            }
        }

        await this.sequelize.transaction(async (t) => {
            await this.taskHistoryModel.destroy({ where: { taskId: id }, transaction: t });
            await task.destroy({ transaction: t });
        });
    }

    async getHistory(id: string): Promise<TaskHistory[]> {
        return this.taskHistoryModel.findAll({
            where: { taskId: id },
            order: [['createdAt', 'DESC']],
        });
    }

    async findByProject(projectId: string): Promise<Task[]> {
        return this.taskModel.findAll({
            where: { projectId },
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Team, as: 'assignedToTeam' },
                { model: Project },
            ],
        });
    }

    async findByUserId(userId: string): Promise<Task[]> {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        return this.findByEmployee(employee.id);
    }

    async updateStateForUser(taskId: string, userId: string, state: string, blockReason?: string): Promise<{ task: Task; gamification?: GamificationResult }> {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const task = await this.taskModel.findByPk(taskId);
        if (!task) throw new NotFoundException('Task not found');
        if (task.getDataValue('assignedToId') !== employee.id) throw new ForbiddenException('Not your task');

        const previousState = task.getDataValue('state');

        // Idempotent: already in the desired state — return as-is
        if (previousState === state) {
            return { task };
        }

        // Prevent state regression from COMPLETED
        if (previousState === 'COMPLETED' && state !== 'COMPLETED') {
            throw new ForbiddenException('Cannot change state of a completed task');
        }

        // All state writes + gamification + ticket sync in one transaction
        let gamification: GamificationResult | undefined;
        await this.sequelize.transaction(async (t) => {
            task.set('state', state);
            if (state === 'IN_PROGRESS' && !task.getDataValue('startedAt')) {
                task.set('startedAt', new Date());
            }
            if (state === 'COMPLETED' && !task.getDataValue('completedAt')) {
                task.set('completedAt', new Date());
            }
            if (state === 'BLOCKED' && blockReason) {
                task.set('blockReason', blockReason);
            } else if (state !== 'BLOCKED') {
                task.set('blockReason', null);
            }
            await task.save({ transaction: t });

            // Award points and check badges on task completion (only on first completion)
            if (state === 'COMPLETED' && previousState !== 'COMPLETED') {
                gamification = await this.gamificationService.processTaskCompletion(employee.id, task, t);
            }

            // Sync linked ticket status (only on state change)
            const ticketId = task.getDataValue('ticketId');
            if (ticketId && TASK_TO_TICKET_STATUS[state] && state !== previousState) {
                await this.ticketModel.update(
                    { status: TASK_TO_TICKET_STATUS[state] },
                    { where: { id: ticketId }, transaction: t },
                );
            }
        });

        // Notifications sent after commit (fire-and-forget, cannot be rolled back)
        const ticketId = task.getDataValue('ticketId');
        if (state === 'COMPLETED' && previousState !== 'COMPLETED' && !ticketId) {
            const empName = `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`;
            const deptId = employee.getDataValue('departmentId');
            if (deptId) {
                const dept = await this.departmentModel.findByPk(deptId, {
                    include: [{ model: Employee, as: 'head' }],
                });
                const head = dept?.getDataValue('head');
                const hodUserId = head?.getDataValue('userId');
                if (hodUserId && hodUserId !== userId) {
                    await this.notificationsService.create({
                        title: 'Task completed',
                        body: `${empName} has completed the task "${task.getDataValue('title')}"`,
                        titleFr: 'Tâche terminée',
                        bodyFr: `${empName} a terminé la tâche "${task.getDataValue('title')}"`,
                        type: 'task',
                        userId: hodUserId,
                    });
                }
            }
        }

        // Notify ticket stakeholders after commit (state already synced in transaction above)
        if (ticketId && TASK_TO_TICKET_STATUS[state] && state !== previousState) {
            const ticketStatus = TASK_TO_TICKET_STATUS[state];
            const ticket = await this.ticketModel.findByPk(ticketId);
            if (ticket) {
                const empName = `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`;
                const ticketTitle = ticket.getDataValue('title');
                const creatorId = ticket.getDataValue('createdById');
                const deptId = ticket.getDataValue('targetDepartmentId');

                const STATUS_LABELS: Record<string, string> = { IN_PROGRESS: 'started working on', COMPLETED: 'completed' };
                const STATUS_LABELS_FR: Record<string, string> = { IN_PROGRESS: 'commencé à traiter', COMPLETED: 'résolu' };
                const action = STATUS_LABELS[ticketStatus] || ticketStatus.toLowerCase();
                const actionFr = STATUS_LABELS_FR[ticketStatus] || ticketStatus.toLowerCase();

                const notifications: { title: string; body: string; titleFr?: string; bodyFr?: string; type: string; userId: string }[] = [];

                if (creatorId) {
                    notifications.push({
                        title: `Ticket ${ticketStatus.toLowerCase()}: ${ticketTitle}`,
                        body: `${empName} has ${action} your ticket "${ticketTitle}".`,
                        titleFr: `Ticket ${ticketStatus.toLowerCase()} : ${ticketTitle}`,
                        bodyFr: `${empName} a ${actionFr} votre ticket "${ticketTitle}".`,
                        type: 'ticket',
                        userId: creatorId,
                    });
                }
                if (deptId) {
                    const dept = await this.departmentModel.findByPk(deptId, { include: [{ model: Employee, as: 'head' }] });
                    const hodUserId = dept?.getDataValue('head')?.getDataValue('userId');
                    if (hodUserId && hodUserId !== creatorId) {
                        notifications.push({
                            title: `Ticket ${ticketStatus.toLowerCase()}: ${ticketTitle}`,
                            body: `${empName} has ${action} the ticket "${ticketTitle}".`,
                            titleFr: `Ticket ${ticketStatus.toLowerCase()} : ${ticketTitle}`,
                            bodyFr: `${empName} a ${actionFr} le ticket "${ticketTitle}".`,
                            type: 'ticket',
                            userId: hodUserId,
                        });
                    }
                }
                if (notifications.length > 0) await this.notificationsService.createMany(notifications);
            }
        }

        const updatedTask = await task.reload({
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Team, as: 'assignedToTeam' },
                { model: Project },
            ],
        });

        return { task: updatedTask, gamification };
    }

    async selfAssign(userId: string, dto: any): Promise<Task> {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const task = await this.taskModel.create({
            ...dto,
            assignedToId: employee.id,
            selfAssigned: true,
            state: 'CREATED',
        });

        return task.reload({
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Project },
            ],
        });
    }

    async findByEmployee(employeeId: string): Promise<Task[]> {
        return this.taskModel.findAll({
            where: { assignedToId: employeeId },
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Team, as: 'assignedToTeam' },
                { model: Project },
            ],
        });
    }
}

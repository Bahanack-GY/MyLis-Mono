
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Task } from '../models/task.model';
import { TaskHistory } from '../models/task-history.model';
import { Subtask } from '../models/subtask.model';
import { Employee } from '../models/employee.model';
import { Ticket } from '../models/ticket.model';
import { Department } from '../models/department.model';
import { Team } from '../models/team.model';
import { Project } from '../models/project.model';
import { TaskNature } from '../models/task-nature.model';
import { Lead } from '../models/lead.model';
import { TaskAttachment } from '../models/task-attachment.model';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService, type GamificationResult } from '../gamification/gamification.service';
import { SseService } from '../sse/sse.service';
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
        @InjectModel(Subtask)
        private subtaskModel: typeof Subtask,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Ticket)
        private ticketModel: typeof Ticket,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectModel(TaskAttachment)
        private taskAttachmentModel: typeof TaskAttachment,
        @InjectModel(Lead)
        private leadModel: typeof Lead,
        @InjectConnection()
        private sequelize: Sequelize,
        private notificationsService: NotificationsService,
        private gamificationService: GamificationService,
        private sseService: SseService,
    ) { }

    /* ─── Sync Lead Actions from Tasks ──────────────────────── */

    private async syncLeadActions(leadId: string): Promise<void> {
        if (!leadId) return;
        const lead = await this.leadModel.findByPk(leadId);
        if (!lead) return;

        // Last action: most recently completed task linked to this lead
        const lastCompleted = await this.taskModel.findOne({
            where: { leadId, state: { [Op.in]: ['COMPLETED', 'REVIEWED'] } },
            order: [['completedAt', 'DESC']],
        });

        // Next action: earliest upcoming non-completed task
        const nextPlanned = await this.taskModel.findOne({
            where: { leadId, state: { [Op.notIn]: ['COMPLETED', 'REVIEWED'] } },
            order: [['startDate', 'ASC'], ['createdAt', 'ASC']],
        });

        const updates: any = {};

        if (lastCompleted) {
            updates.lastAction = lastCompleted.getDataValue('title');
            updates.lastActionDate = lastCompleted.getDataValue('completedAt')
                ? new Date(lastCompleted.getDataValue('completedAt')).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            updates.lastActionResult = 'Tâche terminée';
        }

        updates.nextAction = nextPlanned ? nextPlanned.getDataValue('title') : null;
        updates.nextActionDeadline = nextPlanned
            ? (nextPlanned.getDataValue('startDate') || nextPlanned.getDataValue('dueDate') || null)
            : null;

        await lead.update(updates);
    }

    async create(createTaskDto: any, createdByUserId?: string): Promise<Task> {
        if (createTaskDto.assignedToId) {
            const compliance = await this.checkWeeklyCompliance(createTaskDto.assignedToId);
            if (!compliance.canCreate) {
                throw new ForbiddenException(
                    `Cannot create task: the assigned employee has ${compliance.pendingTasks.length} task(s) from last week that need status updates.`,
                );
            }
        }

        const task = await this.taskModel.create({ ...createTaskDto, createdByUserId: createdByUserId || null });

        // Sync lead actions if task is linked to a lead
        if (createTaskDto.leadId) {
            await this.syncLeadActions(createTaskDto.leadId);
        }

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

                // Extra notification if task is urgent and/or important
                if (createTaskDto.urgent || createTaskDto.important) {
                    const flags = [createTaskDto.urgent ? 'urgent' : null, createTaskDto.important ? 'important' : null].filter(Boolean).join(' & ');
                    const flagsFr = [createTaskDto.urgent ? 'urgente' : null, createTaskDto.important ? 'importante' : null].filter(Boolean).join(' & ');
                    const taskTitle = task.getDataValue('title');
                    await this.notificationsService.create({
                        title: `⚠ ${flags.charAt(0).toUpperCase() + flags.slice(1)} task assigned`,
                        body: `You have been assigned an ${flags} task: "${taskTitle}". Please prioritize this task.`,
                        titleFr: `⚠ Tâche ${flagsFr} assignée`,
                        bodyFr: `Une tâche ${flagsFr} vous a été assignée : "${taskTitle}". Veuillez prioriser cette tâche.`,
                        type: 'task',
                        userId: employee.userId,
                    });
                }
            }
        }

        this.sseService.emit('tasks', 'task_created');
        return task;
    }

    async findAll(departmentId?: string, from?: string, to?: string): Promise<Task[]> {
        const where: any = {};
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }
        const baseInclude: any[] = [
            { model: Team, as: 'assignedToTeam', attributes: ['id', 'name'] },
            { model: Project, attributes: ['id', 'name'] },
            { model: TaskNature, attributes: ['id', 'name', 'color'] },
            { model: Lead, attributes: ['id', 'code', 'company'] },
            {
                model: Subtask, as: 'subtasks',
                attributes: ['id', 'taskId', 'title', 'completed', 'completedAt', 'order'],
            },
        ];
        const include: any[] = departmentId
            ? [{ model: Employee, as: 'assignedTo', where: { departmentId }, required: true, attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'departmentId'] }, ...baseInclude]
            : [{ model: Employee, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'departmentId'] }, ...baseInclude];
        return this.taskModel.findAll({ where, include });
    }

    async findAllPaginated(params: {
        departmentId?: string;
        employeeId?: string;
        states?: string[];
        boardFrom?: string;
        boardTo?: string;
        page: number;
        limit: number;
    }): Promise<{ rows: Task[]; count: number }> {
        const where: any = {};

        if (params.states?.length) {
            where.state = { [Op.in]: params.states };
        }
        if (params.employeeId) {
            where.assignedToId = params.employeeId;
        }

        // Date-range overlap: task overlaps [boardFrom, boardTo]
        // Show task if: (startDate IS NULL OR startDate <= boardTo) AND (endDate IS NULL OR endDate >= boardFrom)
        const andConditions: any[] = [];
        if (params.boardTo) {
            andConditions.push({
                [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: new Date(params.boardTo) } }],
            });
        }
        if (params.boardFrom) {
            andConditions.push({
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: new Date(params.boardFrom) } }],
            });
        }
        if (andConditions.length) {
            where[Op.and] = andConditions;
        }

        const employeeInclude: any = {
            model: Employee,
            as: 'assignedTo',
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'departmentId'],
        };
        if (params.departmentId) {
            employeeInclude.where = { departmentId: params.departmentId };
            employeeInclude.required = true;
        }

        return this.taskModel.findAndCountAll({
            where,
            include: [
                employeeInclude,
                { model: Team, as: 'assignedToTeam', attributes: ['id', 'name'] },
                { model: Project, attributes: ['id', 'name'] },
                { model: TaskNature, attributes: ['id', 'name', 'color'] },
                { model: Lead, attributes: ['id', 'code', 'company'] },
                {
                    model: Subtask,
                    as: 'subtasks',
                    attributes: ['id', 'taskId', 'title', 'completed', 'completedAt', 'order'],
                },
            ],
            limit: params.limit,
            offset: (params.page - 1) * params.limit,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });
    }

    async findOne(id: string): Promise<Task | null> {
        return this.taskModel.findByPk(id, {
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Team, as: 'assignedToTeam' },
                Project,
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Subtask, as: 'subtasks' }, { model: TaskAttachment, as: 'attachments' },
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
            const removedLeadId = task.getDataValue('leadId');
            await this.sequelize.transaction(async (t) => {
                await this.taskHistoryModel.destroy({ where: { taskId: id }, transaction: t });
                await task.destroy({ transaction: t });
            });
            if (removedLeadId) {
                await this.syncLeadActions(removedLeadId);
            }
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

        const editableFields = ['title', 'description', 'difficulty', 'startDate', 'endDate', 'dueDate', 'startTime', 'natureId', 'leadId', 'urgent', 'important'];
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

        // Extra notification when urgent/important flag is turned ON
        const urgentTurnedOn = changes.urgent?.to === true;
        const importantTurnedOn = changes.important?.to === true;
        if (urgentTurnedOn || importantTurnedOn) {
            const flags = [urgentTurnedOn ? 'urgent' : null, importantTurnedOn ? 'important' : null].filter(Boolean).join(' & ');
            const flagsFr = [urgentTurnedOn ? 'urgente' : null, importantTurnedOn ? 'importante' : null].filter(Boolean).join(' & ');
            const taskTitle = task.getDataValue('title');
            const assignedTo = task.get('assignedTo') as any;
            const empUserId = assignedTo?.userId || assignedTo?.getDataValue?.('userId');
            if (empUserId) {
                await this.notificationsService.create({
                    title: `⚠ Task marked as ${flags}`,
                    body: `Your task "${taskTitle}" has been marked as ${flags}. Please prioritize accordingly.`,
                    titleFr: `⚠ Tâche marquée ${flagsFr}`,
                    bodyFr: `Votre tâche "${taskTitle}" a été marquée ${flagsFr}. Veuillez prioriser en conséquence.`,
                    type: 'task',
                    userId: empUserId,
                });
            }
        }

        const reloadedTask = await task.reload({ include: [{ model: Employee, as: 'assignedTo' }, Project, TaskNature, { model: Lead, attributes: ['id', 'code', 'company'] }, { model: TaskAttachment, as: 'attachments' }] });

        // Sync lead actions if leadId changed or task dates changed
        const currentLeadId = task.getDataValue('leadId');
        if (currentLeadId) {
            await this.syncLeadActions(currentLeadId);
        }
        // If leadId changed, also sync the old lead
        if (changes.leadId && changes.leadId.from) {
            await this.syncLeadActions(changes.leadId.from);
        }

        return reloadedTask;
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
        const deletedTaskLeadId = task.getDataValue('leadId');

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

        // Sync lead actions after deletion
        if (deletedTaskLeadId) {
            await this.syncLeadActions(deletedTaskLeadId);
        }
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
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Subtask, as: 'subtasks' }, { model: TaskAttachment, as: 'attachments' },
            ],
        });
    }

    async findByLead(leadId: string): Promise<Task[]> {
        return this.taskModel.findAll({
            where: { leadId },
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Project },
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Subtask, as: 'subtasks' }, { model: TaskAttachment, as: 'attachments' },
            ],
            order: [['createdAt', 'DESC']],
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
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: TaskAttachment, as: 'attachments' },
            ],
        });

        // Sync lead actions when task state changes
        const leadId = task.getDataValue('leadId');
        if (leadId) {
            await this.syncLeadActions(leadId);
        }

        return { task: updatedTask, gamification };
    }

    async selfAssign(userId: string, dto: any): Promise<Task> {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const compliance = await this.checkWeeklyCompliance(employee.id);
        if (!compliance.canCreate) {
            throw new ForbiddenException(
                `Cannot self-assign task: you have ${compliance.pendingTasks.length} task(s) from last week that need status updates.`,
            );
        }

        const today = new Date().toISOString().split('T')[0];
        const task = await this.taskModel.create({
            ...dto,
            startDate: dto.startDate || today,
            endDate: dto.endDate || dto.startDate || today,
            assignedToId: employee.id,
            selfAssigned: true,
            state: 'CREATED',
        });

        const reloaded = await task.reload({
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Project },
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: TaskAttachment, as: 'attachments' },
            ],
        });

        // Sync lead actions if task is linked to a lead
        if (dto.leadId) {
            await this.syncLeadActions(dto.leadId);
        }

        // Notify department head if self-assigned task is urgent/important
        if (dto.urgent || dto.important) {
            const deptId = employee.getDataValue('departmentId');
            if (deptId) {
                const dept = await this.departmentModel.findByPk(deptId, {
                    include: [{ model: Employee, as: 'head' }],
                });
                const hodUserId = dept?.getDataValue('head')?.getDataValue('userId');
                if (hodUserId) {
                    const empName = `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`;
                    const flags = [dto.urgent ? 'urgent' : null, dto.important ? 'important' : null].filter(Boolean).join(' & ');
                    const flagsFr = [dto.urgent ? 'urgente' : null, dto.important ? 'importante' : null].filter(Boolean).join(' & ');
                    const taskTitle = task.getDataValue('title');
                    await this.notificationsService.create({
                        title: `⚠ ${flags.charAt(0).toUpperCase() + flags.slice(1)} task self-assigned`,
                        body: `${empName} self-assigned an ${flags} task: "${taskTitle}".`,
                        titleFr: `⚠ Tâche ${flagsFr} auto-assignée`,
                        bodyFr: `${empName} s'est auto-assigné une tâche ${flagsFr} : "${taskTitle}".`,
                        type: 'task',
                        userId: hodUserId,
                    });
                }
            }
        }

        return reloaded;
    }

    // ── Weekly compliance ─────────────────────────────────────────────

    async checkWeeklyCompliance(employeeId: string): Promise<{ canCreate: boolean; pendingTasks: Task[] }> {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dow = today.getDay(); // 0=Sun
        const currentMonday = new Date(today);
        currentMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

        const prevMonday = new Date(currentMonday);
        prevMonday.setDate(currentMonday.getDate() - 7);
        const prevSunday = new Date(currentMonday.getTime() - 1); // last ms of previous Sunday

        const staleTasks = await this.taskModel.findAll({
            where: {
                assignedToId: employeeId,
                state: { [Op.in]: ['CREATED', 'ASSIGNED'] },
            },
            include: [Project, TaskNature],
        });

        const pendingTasks = staleTasks.filter(task => {
            const startDate = task.getDataValue('startDate');
            const endDate = task.getDataValue('endDate');
            const createdAt = task.getDataValue('createdAt');

            const ref = startDate ? new Date(startDate) : new Date(createdAt);
            if (ref < prevMonday || ref > prevSunday) return false;

            // Exempt long-running tasks (> 7 days)
            if (startDate && endDate) {
                const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000;
                if (days > 7) return false;
            }
            return true;
        });

        return { canCreate: pendingTasks.length === 0, pendingTasks };
    }

    async weeklyCheckForUser(userId: string): Promise<{ canCreate: boolean; pendingTasks: Task[] }> {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return { canCreate: true, pendingTasks: [] };
        return this.checkWeeklyCompliance(employee.id);
    }

    async findByEmployee(employeeId: string): Promise<Task[]> {
        return this.taskModel.findAll({
            where: { assignedToId: employeeId },
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Team, as: 'assignedToTeam' },
                { model: Project },
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Subtask, as: 'subtasks' }, { model: TaskAttachment, as: 'attachments' },
            ],
        });
    }

    // ── Weekly planning ──────────────────────────────────────────────

    async findByWeek(employeeId: string, weekStartDate: Date): Promise<Task[]> {
        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return this.taskModel.findAll({
            where: {
                assignedToId: employeeId,
                startDate: { [Op.between]: [weekStartDate, weekEnd] },
            },
            include: [
                { model: Employee, as: 'assignedTo' },
                { model: Project },
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Subtask, as: 'subtasks' }, { model: TaskAttachment, as: 'attachments' },
            ],
            order: [['startDate', 'ASC']],
        });
    }

    async findMyWeek(userId: string, weekStartDate: Date): Promise<Task[]> {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        return this.findByWeek(employee.id, weekStartDate);
    }

    async findWeekForAllEmployees(departmentId: string | undefined, weekStartDate: Date): Promise<Task[]> {
        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const where: any = { startDate: { [Op.between]: [weekStartDate, weekEnd] } };
        const include: any[] = [
            { model: Employee, as: 'assignedTo' },
            { model: Project },
            TaskNature,
            { model: Lead, attributes: ['id', 'code', 'company'] },
            { model: Subtask, as: 'subtasks' }, { model: TaskAttachment, as: 'attachments' },
        ];

        if (departmentId) {
            include[0].where = { departmentId };
            include[0].required = true;
        }

        return this.taskModel.findAll({ where, include, order: [['startDate', 'ASC']] });
    }

    /* ─── Task Transfer ──────────────────────────────────────── */

    async transferToWeek(taskId: string, userId: string, targetWeekStart: string): Promise<Task> {
        const task = await this.taskModel.findByPk(taskId, {
            include: [{ model: Employee, as: 'assignedTo' }],
        });
        if (!task) throw new NotFoundException('Task not found');

        // Verify ownership
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee || task.getDataValue('assignedToId') !== employee.id) {
            throw new ForbiddenException('Not your task');
        }

        // Only allow transfer of pending tasks (CREATED, ASSIGNED)
        const state = task.getDataValue('state');
        if (state !== 'CREATED' && state !== 'ASSIGNED') {
            throw new BadRequestException('Can only transfer pending tasks');
        }

        const originalStartDate = task.getDataValue('startDate');
        const originalEndDate = task.getDataValue('endDate');
        const transferredFromWeek = task.getDataValue('transferredFromWeek') || originalStartDate;

        // Calculate new dates (preserve duration)
        const targetStart = new Date(targetWeekStart);
        const duration = originalEndDate && originalStartDate
            ? (new Date(originalEndDate).getTime() - new Date(originalStartDate).getTime()) / (1000 * 60 * 60 * 24)
            : 6; // default to full week
        const targetEnd = new Date(targetStart);
        targetEnd.setDate(targetEnd.getDate() + duration);

        // Update task with transaction + history
        await this.sequelize.transaction(async (t) => {
            await this.taskHistoryModel.create({
                taskId,
                changedByUserId: userId,
                changedByName: `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`,
                changes: {
                    startDate: { from: originalStartDate, to: targetWeekStart },
                    endDate: { from: originalEndDate, to: targetEnd.toISOString().split('T')[0] },
                    transferredFromWeek: { from: task.getDataValue('transferredFromWeek'), to: transferredFromWeek },
                },
            }, { transaction: t });

            await task.update({
                startDate: targetWeekStart,
                endDate: targetEnd.toISOString().split('T')[0],
                transferredFromWeek,
            }, { transaction: t });
        });

        return task.reload({
            include: [
                { model: Employee, as: 'assignedTo' },
                Project,
                TaskNature,
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: TaskAttachment, as: 'attachments' },
            ],
        });
    }

    /* ─── Subtask Methods ────────────────────────────────────── */

    async createSubtask(taskId: string, title: string): Promise<Subtask> {
        const task = await this.taskModel.findByPk(taskId);
        if (!task) {
            throw new NotFoundException('Task not found');
        }

        const maxOrder = await this.subtaskModel.max('order', { where: { taskId } }) as number;
        const subtask = await this.subtaskModel.create({
            taskId,
            title,
            order: (maxOrder || 0) + 1,
            completed: false,
        });

        return subtask;
    }

    async getSubtasks(taskId: string): Promise<Subtask[]> {
        return this.subtaskModel.findAll({
            where: { taskId },
            order: [['order', 'ASC']],
        });
    }

    async updateSubtask(id: string, dto: { title?: string; completed?: boolean; order?: number }): Promise<Subtask> {
        const subtask = await this.subtaskModel.findByPk(id);
        if (!subtask) {
            throw new NotFoundException('Subtask not found');
        }

        if (dto.title !== undefined) subtask.title = dto.title;
        if (dto.completed !== undefined) {
            subtask.completed = dto.completed;
            subtask.completedAt = dto.completed ? new Date() : null;
        }
        if (dto.order !== undefined) subtask.order = dto.order;

        await subtask.save();
        return subtask;
    }

    async deleteSubtask(id: string): Promise<void> {
        const subtask = await this.subtaskModel.findByPk(id);
        if (!subtask) {
            throw new NotFoundException('Subtask not found');
        }
        await subtask.destroy();
    }

    async toggleSubtask(id: string, userId?: string): Promise<{ subtask: Subtask; pointsEarned: number; totalPoints: number; allCompleted: boolean; taskStarted: boolean }> {
        const subtask = await this.subtaskModel.findByPk(id);
        if (!subtask) {
            throw new NotFoundException('Subtask not found');
        }

        const wasCompleted = subtask.completed;
        subtask.completed = !subtask.completed;
        subtask.completedAt = subtask.completed ? new Date() : null;
        await subtask.save();

        let pointsEarned = 0;
        let totalPoints = 0;
        let taskStarted = false;

        const taskId = subtask.getDataValue('taskId');

        // If completing a subtask and the task hasn't started yet, transition it to IN_PROGRESS
        if (!wasCompleted && subtask.completed) {
            const task = await this.taskModel.findByPk(taskId);
            if (task && (task.getDataValue('state') === 'CREATED' || task.getDataValue('state') === 'ASSIGNED')) {
                await task.update({ state: 'IN_PROGRESS', startedAt: new Date() });
                taskStarted = true;
            }
        }

        // Award 1 point when checking a subtask (not when unchecking)
        if (!wasCompleted && subtask.completed && userId) {
            const employee = await this.employeeModel.findOne({ where: { userId } });
            if (employee) {
                const current = employee.getDataValue('points') || 0;
                totalPoints = current + 1;
                await employee.update({ points: totalPoints });
                pointsEarned = 1;
            }
        }

        // Check if all subtasks of the parent task are now completed
        const allSubtasks = await this.subtaskModel.findAll({ where: { taskId } });
        const allCompleted = allSubtasks.length > 0 && allSubtasks.every(s => s.getDataValue('completed'));

        return { subtask, pointsEarned, totalPoints, allCompleted, taskStarted };
    }

    async reorderSubtasks(taskId: string, subtaskIds: string[]): Promise<void> {
        await this.sequelize.transaction(async (transaction) => {
            for (let i = 0; i < subtaskIds.length; i++) {
                await this.subtaskModel.update(
                    { order: i + 1 },
                    { where: { id: subtaskIds[i], taskId }, transaction }
                );
            }
        });
    }

    /* ─── Attachment Methods ─────────────────────────────────── */

    async addAttachment(taskId: string, file: { fileName: string; filePath: string; fileType: string; size: number }, uploadedByUserId: string): Promise<TaskAttachment> {
        const task = await this.taskModel.findByPk(taskId);
        if (!task) throw new NotFoundException('Task not found');
        return this.taskAttachmentModel.create({ taskId, ...file, uploadedByUserId });
    }

    async removeAttachment(taskId: string, attachmentId: string): Promise<void> {
        const attachment = await this.taskAttachmentModel.findOne({ where: { id: attachmentId, taskId } });
        if (!attachment) throw new NotFoundException('Attachment not found');
        const { unlinkSync } = require('fs');
        const { join } = require('path');
        try { unlinkSync(join(process.cwd(), attachment.filePath)); } catch {}
        await attachment.destroy();
    }

    /* ─── Time Distribution ──────────────────────────────────── */

    async getTimeDistribution(employeeId: string) {
        const tasks = await this.taskModel.findAll({
            where: { assignedToId: employeeId },
            include: [TaskNature],
            attributes: ['id', 'startTime', 'endTime', 'startDate', 'endDate', 'natureId'],
        });

        const distribution: Record<string, { name: string; color: string; hours: number }> = {};
        const uncategorizedKey = '__uncategorized__';

        for (const task of tasks) {
            let hours = 1; // default: 1 unit per task

            if (task.startTime && task.endTime) {
                const [sh, sm] = task.startTime.split(':').map(Number);
                const [eh, em] = task.endTime.split(':').map(Number);
                const dailyHours = (eh * 60 + em - sh * 60 - sm) / 60;
                if (dailyHours > 0) {
                    let days = 1;
                    if (task.startDate && task.endDate) {
                        const start = new Date(task.startDate);
                        const end = new Date(task.endDate);
                        days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                    }
                    hours = dailyHours * days;
                }
            }

            const key = task.natureId || uncategorizedKey;
            if (!distribution[key]) {
                distribution[key] = {
                    name: task.nature?.name || '__uncategorized__',
                    color: task.nature?.color || '#9CA3AF',
                    hours: 0,
                };
            }
            distribution[key].hours += hours;
        }

        const totalHours = Object.values(distribution).reduce((sum, d) => sum + d.hours, 0);

        return Object.values(distribution).map(d => ({
            name: d.name,
            color: d.color,
            hours: Math.round(d.hours * 10) / 10,
            percentage: totalHours > 0 ? Math.round((d.hours / totalHours) * 1000) / 10 : 0,
        })).sort((a, b) => b.hours - a.hours);
    }
}

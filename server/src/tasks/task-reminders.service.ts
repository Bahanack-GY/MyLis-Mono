
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Task } from '../models/task.model';
import { Employee } from '../models/employee.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TaskRemindersService {
    private readonly logger = new Logger(TaskRemindersService.name);

    constructor(
        @InjectModel(Task)
        private taskModel: typeof Task,
        private notificationsService: NotificationsService,
    ) { }

    /** Runs every day at 8:00 AM — sends reminders for urgent/important tasks due today or tomorrow */
    @Cron('0 8 * * *')
    async sendDueDateReminders() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2); // end of tomorrow

        const tasks = await this.taskModel.findAll({
            where: {
                [Op.or]: [{ urgent: true }, { important: true }],
                state: { [Op.notIn]: ['COMPLETED', 'REVIEWED'] },
                dueDate: { [Op.between]: [todayStart, tomorrowEnd] },
            },
            include: [{ model: Employee, as: 'assignedTo' }],
        });

        this.logger.log(`Found ${tasks.length} urgent/important task(s) due today or tomorrow`);

        for (const task of tasks) {
            const assignedTo = task.get('assignedTo') as Employee | null;
            if (!assignedTo?.userId) continue;

            const isUrgent = task.getDataValue('urgent');
            const isImportant = task.getDataValue('important');
            const flags = [isUrgent ? 'urgent' : null, isImportant ? 'important' : null].filter(Boolean).join(' & ');
            const flagsFr = [isUrgent ? 'urgente' : null, isImportant ? 'importante' : null].filter(Boolean).join(' & ');
            const taskTitle = task.getDataValue('title');

            const dueDate = new Date(task.getDataValue('dueDate'));
            const isDueToday = dueDate.toDateString() === now.toDateString();

            await this.notificationsService.create({
                title: `⏰ Reminder: ${flags} task due ${isDueToday ? 'today' : 'tomorrow'}`,
                body: `Your ${flags} task "${taskTitle}" is due ${isDueToday ? 'today' : 'tomorrow'}. Please ensure it is completed on time.`,
                titleFr: `⏰ Rappel : tâche ${flagsFr} due ${isDueToday ? "aujourd'hui" : 'demain'}`,
                bodyFr: `Votre tâche ${flagsFr} "${taskTitle}" est due ${isDueToday ? "aujourd'hui" : 'demain'}. Veuillez la terminer à temps.`,
                type: 'task',
                userId: assignedTo.userId,
            });
        }

        this.logger.log(`Sent ${tasks.length} due-date reminder(s)`);
    }
}

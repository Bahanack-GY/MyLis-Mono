
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from '../models/employee.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TaskFillRemindersService {
    private readonly logger = new Logger(TaskFillRemindersService.name);

    constructor(
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) {}

    /** 9:00 AM — morning kickoff: plan your day */
    @Cron('0 9 * * *')
    async sendMorningReminder() {
        await this.sendReminder(
            '📋 Start your day right — log your tasks in MyLIS',
            'Good morning! Take a moment to log all your tasks for today in MyLIS. Keeping your task list up to date helps your team stay aligned and ensures nothing falls through the cracks.',
            '📋 Bien démarrer la journée — renseignez vos tâches dans MyLIS',
            'Bonjour ! Prenez un moment pour enregistrer toutes vos tâches du jour dans MyLIS. Maintenir votre liste à jour aide votre équipe à rester coordonnée et garantit qu\'aucune tâche n\'est oubliée.',
            'morning',
        );
    }

    /** 4:30 PM — end-of-day check: update progress */
    @Cron('30 16 * * *')
    async sendAfternoonReminder() {
        await this.sendReminder(
            '✅ End-of-day check — update your tasks in MyLIS',
            'Before you wrap up, make sure all your tasks, progress, and completed work are recorded in MyLIS. Accurate records help management track performance and plan resources effectively.',
            '✅ Bilan de fin de journée — mettez à jour vos tâches dans MyLIS',
            'Avant de terminer votre journée, assurez-vous que toutes vos tâches, avancements et travaux réalisés sont bien enregistrés dans MyLIS. Des données à jour permettent à la direction de suivre les performances et de planifier efficacement les ressources.',
            'afternoon',
        );
    }

    private async sendReminder(
        titleEn: string,
        bodyEn: string,
        titleFr: string,
        bodyFr: string,
        slot: string,
    ) {
        const employees = await this.employeeModel.findAll({
            where: { dismissed: false },
            attributes: ['userId'],
        });

        if (!employees.length) {
            this.logger.log(`Task fill reminder (${slot}): no active employees found`);
            return;
        }

        const notifications = employees
            .map(e => e.getDataValue('userId'))
            .filter(Boolean)
            .map(userId => ({ title: titleEn, body: bodyEn, titleFr, bodyFr, type: 'task' as const, userId }));

        await this.notificationsService.createMany(notifications);
        this.logger.log(`Task fill reminder (${slot}): sent to ${notifications.length} employee(s)`);
    }
}

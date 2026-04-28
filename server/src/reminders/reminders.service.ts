import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron } from '@nestjs/schedule';
import { Op } from 'sequelize';
import { Reminder } from '../models/reminder.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersService {
    constructor(
        @InjectModel(Reminder)
        private reminderModel: typeof Reminder,
        private notificationsService: NotificationsService,
    ) {}

    async create(userId: string, dto: { title: string; description?: string; dueDate: string }) {
        return this.reminderModel.create({
            userId,
            title: dto.title,
            description: dto.description,
            dueDate: dto.dueDate,
        });
    }

    async findAll(userId: string) {
        return this.reminderModel.findAll({
            where: { userId },
            order: [['dueDate', 'ASC']],
        });
    }

    async markDone(id: string, userId: string) {
        const reminder = await this.reminderModel.findOne({ where: { id, userId } });
        if (!reminder) {
            throw new NotFoundException(`Reminder ${id} not found`);
        }
        reminder.isCompleted = true;
        reminder.completedAt = new Date();
        return reminder.save();
    }

    async remove(id: string, userId: string) {
        const reminder = await this.reminderModel.findOne({ where: { id, userId } });
        if (!reminder) {
            throw new NotFoundException(`Reminder ${id} not found`);
        }
        await reminder.destroy();
    }

    @Cron('0 8 * * *')
    async sendDailyReminders() {
        const today = new Date().toISOString().slice(0, 10);

        const reminders = await this.reminderModel.findAll({
            where: { isCompleted: false },
        });

        for (const reminder of reminders) {
            const daysUntil = Math.round(
                (new Date(reminder.dueDate).getTime() - new Date(today).getTime()) / 86400000,
            );

            let titleEn: string | null = null;
            let titleFr: string | null = null;
            let bodyEn: string;
            let bodyFr: string;

            if (daysUntil === 10) {
                titleEn = `📅 Reminder in 10 days: ${reminder.title}`;
                titleFr = `📅 Rappel dans 10 jours : ${reminder.title}`;
            } else if (daysUntil === 5) {
                titleEn = `⏰ Reminder in 5 days: ${reminder.title}`;
                titleFr = `⏰ Rappel dans 5 jours : ${reminder.title}`;
            } else if (daysUntil === 1) {
                titleEn = `🔔 Tomorrow: ${reminder.title}`;
                titleFr = `🔔 Demain : ${reminder.title}`;
            } else if (daysUntil === 0) {
                titleEn = `🚨 Today: ${reminder.title}`;
                titleFr = `🚨 Aujourd'hui : ${reminder.title}`;
            } else if (daysUntil < 0) {
                titleEn = `❗ Overdue: ${reminder.title}`;
                titleFr = `❗ En retard : ${reminder.title}`;
            }

            if (!titleEn || !titleFr) continue;

            bodyEn = reminder.description || reminder.title;
            bodyFr = reminder.description || reminder.title;

            await this.notificationsService.create({
                title: titleEn,
                body: bodyEn,
                titleFr,
                bodyFr,
                type: 'reminder',
                userId: reminder.userId,
            });
        }
    }
}

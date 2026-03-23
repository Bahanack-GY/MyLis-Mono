
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';
import { MailService } from './mail.service';

type PushCallback = (userId: string, payload: { title: string; body: string; type: string }) => void;

@Injectable()
export class NotificationsService {
    private pushCallback: PushCallback | null = null;

    constructor(
        @InjectModel(Notification)
        private notificationModel: typeof Notification,
        @InjectModel(User)
        private userModel: typeof User,
        private mailService: MailService,
    ) { }

    /** Called by ChatGateway to register socket push */
    setPushCallback(cb: PushCallback) {
        this.pushCallback = cb;
    }

    async create(data: { title: string; body: string; titleFr?: string; bodyFr?: string; type: string; userId: string; meta?: Record<string, unknown> }) {
        const notif = await this.notificationModel.create(data);
        this.pushCallback?.(data.userId, { title: data.title, body: data.body, type: data.type });

        // Send email asynchronously (non-blocking)
        this.userModel.findByPk(data.userId).then(user => {
            if (user?.email) {
                this.mailService.sendNotification(user.email, data.title, data.body, data.titleFr, data.bodyFr);
            }
        });

        return notif;
    }

    async createMany(notifications: { title: string; body: string; titleFr?: string; bodyFr?: string; type: string; userId: string; meta?: Record<string, unknown> }[]) {
        const result = await this.notificationModel.bulkCreate(notifications);

        for (const n of notifications) {
            this.pushCallback?.(n.userId, { title: n.title, body: n.body, type: n.type });
        }

        // Send emails asynchronously — batch by unique userId
        const userIds = [...new Set(notifications.map(n => n.userId))];
        this.userModel.findAll({ where: { id: userIds } }).then(users => {
            const emailByUserId = Object.fromEntries(users.map(u => [u.id, u.email]));
            for (const n of notifications) {
                const email = emailByUserId[n.userId];
                if (email) {
                    this.mailService.sendNotification(email, n.title, n.body, n.titleFr, n.bodyFr);
                }
            }
        });

        return result;
    }

    async findForUser(userId: string, limit = 50) {
        return this.notificationModel.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit,
        });
    }

    async markAsRead(id: string, userId: string) {
        return this.notificationModel.update(
            { read: true },
            { where: { id, userId } },
        );
    }

    async markAllAsRead(userId: string) {
        return this.notificationModel.update(
            { read: true },
            { where: { userId, read: false } },
        );
    }
}

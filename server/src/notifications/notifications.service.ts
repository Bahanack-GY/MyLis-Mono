
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { MailService } from './mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

type PushCallback = (userId: string, payload: { title: string; body: string; type: string }) => void;
type DirectEmitCallback = (userId: string, event: string, payload: object) => void;

@Injectable()
export class NotificationsService {
    private pushCallback: PushCallback | null = null;
    private directEmitCallback: DirectEmitCallback | null = null;

    constructor(
        @InjectModel(Notification)
        private notificationModel: typeof Notification,
        @InjectModel(User)
        private userModel: typeof User,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private mailService: MailService,
        private whatsAppService: WhatsAppService,
    ) { }

    /** Called by ChatGateway to register socket push */
    setPushCallback(cb: PushCallback) {
        this.pushCallback = cb;
    }

    /** Called by ChatGateway to register direct socket emit (not persisted) */
    setDirectEmitCallback(cb: DirectEmitCallback) {
        this.directEmitCallback = cb;
    }

    /** Emit a socket event directly to a user without persisting a notification */
    emitToUser(userId: string, event: string, payload: object) {
        this.directEmitCallback?.(userId, event, payload);
    }

    async create(data: { title: string; body: string; titleFr?: string; bodyFr?: string; type: string; userId: string; meta?: Record<string, unknown> }) {
        const notif = await this.notificationModel.create(data);
        this.pushCallback?.(data.userId, { title: data.title, body: data.body, type: data.type });

        // Send email + WhatsApp asynchronously (non-blocking)
        this.userModel.findByPk(data.userId).then(async user => {
            if (user?.email) {
                this.mailService.sendNotification(user.email, data.title, data.body, data.titleFr, data.bodyFr);
            }
            const employee = await this.employeeModel.findOne({
                where: { userId: data.userId },
                attributes: ['phoneNumber'],
            });
            const phone = employee?.getDataValue('phoneNumber');
            if (phone) {
                this.whatsAppService.enqueue(phone, this.buildWhatsAppText(data.title, data.body, data.titleFr, data.bodyFr));
            }
        });

        return notif;
    }

    async createMany(notifications: { title: string; body: string; titleFr?: string; bodyFr?: string; type: string; userId: string; meta?: Record<string, unknown> }[]) {
        const result = await this.notificationModel.bulkCreate(notifications);

        for (const n of notifications) {
            this.pushCallback?.(n.userId, { title: n.title, body: n.body, type: n.type });
        }

        // Send emails + WhatsApp asynchronously — batch by unique userId
        const userIds = [...new Set(notifications.map(n => n.userId))];
        Promise.all([
            this.userModel.findAll({ where: { id: userIds } }),
            this.employeeModel.findAll({ where: { userId: userIds }, attributes: ['userId', 'phoneNumber'] }),
        ]).then(([users, employees]) => {
            const emailByUserId = Object.fromEntries(users.map(u => [u.id, u.email]));
            const phoneByUserId = Object.fromEntries(
                employees.map(e => [e.getDataValue('userId'), e.getDataValue('phoneNumber')]),
            );
            for (const n of notifications) {
                const email = emailByUserId[n.userId];
                if (email) this.mailService.sendNotification(email, n.title, n.body, n.titleFr, n.bodyFr);

                const phone = phoneByUserId[n.userId];
                if (phone) this.whatsAppService.enqueue(phone, this.buildWhatsAppText(n.title, n.body, n.titleFr, n.bodyFr));
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

    /**
     * Build a clean WhatsApp message.
     * Uses French first (Cameroon primary), English fallback.
     * Bold title + body + signature — no HTML, no headers, just readable text.
     */
    private buildWhatsAppText(titleEn: string, bodyEn: string, titleFr?: string, bodyFr?: string): string {
        const title = titleFr || titleEn;
        const body = bodyFr || bodyEn;
        return `*${title}*\n\n${body}\n\n_— MyLIS_`;
    }
}

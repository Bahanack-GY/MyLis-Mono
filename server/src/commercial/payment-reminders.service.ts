import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Invoice } from '../models/invoice.model';
import { Client } from '../models/client.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { NotificationsService } from '../notifications/notifications.service';

interface ReminderThreshold {
    daysOffset: number; // Negative = before due, Positive = after due (overdue)
    urgency: 'info' | 'warning' | 'critical';
    titleEn: string;
    titleFr: string;
}

@Injectable()
export class PaymentRemindersService {
    private readonly logger = new Logger(PaymentRemindersService.name);

    private readonly thresholds: ReminderThreshold[] = [
        { daysOffset: -7, urgency: 'info', titleEn: '📅 Upcoming Payment Due', titleFr: '📅 Paiement à venir' },
        { daysOffset: -3, urgency: 'warning', titleEn: '⚠️ Payment Due Soon', titleFr: '⚠️ Paiement imminent' },
        { daysOffset: 0, urgency: 'critical', titleEn: '🚨 Payment Due Today', titleFr: '🚨 Paiement dû aujourd\'hui' },
        { daysOffset: 1, urgency: 'critical', titleEn: '🔴 Payment Overdue (1 day)', titleFr: '🔴 Paiement en retard (1 jour)' },
        { daysOffset: 3, urgency: 'critical', titleEn: '🔴 Payment Overdue (3 days)', titleFr: '🔴 Paiement en retard (3 jours)' },
        { daysOffset: 7, urgency: 'critical', titleEn: '🔴 Payment Overdue (1 week)', titleFr: '🔴 Paiement en retard (1 semaine)' },
        { daysOffset: 14, urgency: 'critical', titleEn: '🔴🔴 URGENT: Payment Overdue (2 weeks)', titleFr: '🔴🔴 URGENT : Paiement en retard (2 semaines)' },
    ];

    constructor(
        @InjectModel(Invoice) private invoiceModel: typeof Invoice,
        @InjectModel(Client) private clientModel: typeof Client,
        @InjectModel(Department) private departmentModel: typeof Department,
        @InjectModel(User) private userModel: typeof User,
        @InjectModel(Employee) private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) {}

    @Cron('0 9 * * *') // Daily at 9:00 AM
    async sendPaymentReminders() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        let totalReminders = 0;

        for (const threshold of this.thresholds) {
            const targetDate = new Date(today.getTime() + threshold.daysOffset * 24 * 60 * 60 * 1000);

            const invoices = await this.invoiceModel.findAll({
                where: {
                    status: { [Op.ne]: 'PAID' },
                    dueDate: {
                        [Op.gte]: targetDate,
                        [Op.lt]: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
                    },
                    [Op.or]: [
                        { lastReminderSentAt: { [Op.is]: null } },
                        { lastReminderSentAt: { [Op.lt]: oneDayAgo } },
                    ],
                },
                include: [Client, Department],
            });

            for (const invoice of invoices) {
                await this.sendReminderNotifications(invoice as any, threshold);
                await invoice.update({ lastReminderSentAt: new Date() });
                totalReminders++;
            }
        }

        this.logger.log(`Sent ${totalReminders} payment reminder(s)`);
    }

    private async sendReminderNotifications(invoice: any, threshold: ReminderThreshold) {
        const client = invoice.client;
        const department = invoice.department;
        if (!client) return;

        const clientName = client.name;
        const invoiceNumber = invoice.invoiceNumber;
        const amount = Math.round(invoice.total).toLocaleString();
        const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US');
        const dueDateFr = new Date(invoice.dueDate).toLocaleDateString('fr-FR');

        const bodyEn = `Payment for ${clientName} (Invoice ${invoiceNumber}, ${amount} FCFA) due date: ${dueDate}`;
        const bodyFr = `Paiement pour ${clientName} (Facture ${invoiceNumber}, ${amount} FCFA) échéance : ${dueDateFr}`;

        const recipients: string[] = [];

        // 1. ACCOUNTANT and MANAGER - all invoices
        const accountantsAndManagers = await this.userModel.findAll({
            where: { role: { [Op.in]: ['ACCOUNTANT', 'MANAGER'] } },
            attributes: ['id'],
        });
        recipients.push(...accountantsAndManagers.map(u => u.id));

        // 2. HEAD_OF_DEPARTMENT - department invoices
        if (department) {
            const hods = await this.employeeModel.findAll({
                where: { departmentId: department.id },
                include: [{ model: User, where: { role: 'HEAD_OF_DEPARTMENT' } }],
            });
            recipients.push(...hods.map(e => e.userId).filter(Boolean));
        }

        // 3. COMMERCIAL - department invoices
        if (department) {
            const commercials = await this.employeeModel.findAll({
                where: { departmentId: department.id },
                include: [{ model: User, where: { role: 'COMMERCIAL' } }],
            });
            recipients.push(...commercials.map(e => e.userId).filter(Boolean));
        }

        const uniqueRecipients = [...new Set(recipients)];

        for (const userId of uniqueRecipients) {
            await this.notificationsService.create({
                title: threshold.titleEn,
                body: bodyEn,
                titleFr: threshold.titleFr,
                bodyFr: bodyFr,
                type: 'system',
                userId,
                meta: {
                    invoiceId: invoice.id,
                    clientId: client.id,
                    dueDate: invoice.dueDate,
                    amount: invoice.total,
                    urgency: threshold.urgency,
                },
            });
        }
    }
}

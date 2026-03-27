import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Client } from '../models/client.model';
import { LeadActivity } from '../models/lead-activity.model';
import { Lead } from '../models/lead.model';
import { Employee } from '../models/employee.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClientFollowUpRemindersService {
    private readonly logger = new Logger(ClientFollowUpRemindersService.name);

    constructor(
        @InjectModel(Client) private clientModel: typeof Client,
        @InjectModel(LeadActivity) private activityModel: typeof LeadActivity,
        @InjectModel(Lead) private leadModel: typeof Lead,
        @InjectModel(Employee) private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) {}

    @Cron('0 10 * * *') // Daily at 10:00 AM
    async sendClientInactivityAlerts() {
        const now = new Date();
        const clients = await this.clientModel.findAll({
            include: [{ model: Lead, where: { assignedToId: { [Op.ne]: null } } }],
        });

        let alertCount = 0;

        for (const client of clients) {
            const lastActivity = await this.activityModel.findOne({
                where: { clientId: client.id, activityStatus: 'COMPLETED' },
                order: [['date', 'DESC']],
            });

            if (!lastActivity) continue;

            const lastContactDate = new Date(lastActivity.date);
            const daysSinceContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

            // Alert at 30 and 60 day marks
            if (daysSinceContact === 30 || daysSinceContact === 60) {
                const leads = (client as any).leads || [];
                for (const lead of leads) {
                    if (lead.assignedToId) {
                        const employee = await this.employeeModel.findByPk(lead.assignedToId);
                        if (employee?.userId) {
                            await this.notificationsService.create({
                                title: `⚠️ Client follow-up needed: ${client.name}`,
                                body: `Client "${client.name}" has not been contacted for ${daysSinceContact} days. Last contact: ${lastContactDate.toLocaleDateString()}`,
                                titleFr: `⚠️ Suivi client nécessaire : ${client.name}`,
                                bodyFr: `Le client "${client.name}" n'a pas été contacté depuis ${daysSinceContact} jours. Dernier contact : ${lastContactDate.toLocaleDateString('fr-FR')}`,
                                type: 'system',
                                userId: employee.userId,
                                meta: { clientId: client.id, daysSinceContact },
                            });
                            alertCount++;
                        }
                    }
                }
            }
        }

        this.logger.log(`Sent ${alertCount} client inactivity alert(s)`);
    }
}

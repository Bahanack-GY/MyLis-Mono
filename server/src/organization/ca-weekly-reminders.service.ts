import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { DepartmentMonthlyTarget } from '../models/department-monthly-target.model';
import { Invoice } from '../models/invoice.model';
import { Department } from '../models/department.model';
import { Employee } from '../models/employee.model';
import { NotificationsService } from '../notifications/notifications.service';

const MONTH_NAMES_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class CaWeeklyRemindersService {
    private readonly logger = new Logger(CaWeeklyRemindersService.name);

    constructor(
        @InjectModel(DepartmentMonthlyTarget)
        private monthlyTargetModel: typeof DepartmentMonthlyTarget,
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) {}

    /** Every Monday at 8:00 AM — send weekly CA progress to each HOD */
    @Cron('0 8 * * 1')
    async sendWeeklyCaProgress() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-based

        // Find all departments that have a CA target applicable to this month
        // (either an explicit target this month, or a carry-over from a previous one)
        const departments = await this.departmentModel.findAll({
            include: [{ model: Employee, as: 'head' }],
            attributes: ['id', 'name', 'defaultTargetRevenue'],
        });

        // Revenue window: start of this month → now
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 1);

        // Which day of the month are we in?  Used for a pro-rated progress hint
        const dayOfMonth = now.getDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthElapsed = Math.round((dayOfMonth / daysInMonth) * 100);

        let sent = 0;

        for (const dept of departments) {
            if (!dept.head?.userId) continue;

            // Resolve effective target (with carry-over)
            const targets = await this.monthlyTargetModel.findAll({
                where: {
                    departmentId: dept.id,
                    [Op.or]: [
                        { year: { [Op.lt]: year } },
                        { year, month: { [Op.lte]: month } },
                    ],
                },
                order: [['year', 'DESC'], ['month', 'DESC']],
                limit: 1,
            });

            // Fall back to department default if no explicit/carry-over target exists
            const target = targets.length > 0
                ? Number(targets[0].targetRevenue)
                : (dept.defaultTargetRevenue != null ? Number(dept.defaultTargetRevenue) : 0);
            if (target <= 0) continue;

            // Compute actual revenue for current month so far
            const paidInvoices = await this.invoiceModel.findAll({
                where: {
                    departmentId: dept.id,
                    status: 'PAID',
                    paidAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
                },
                attributes: ['total'],
            });
            const actual = paidInvoices.reduce((s, inv) => s + Number(inv.total), 0);

            const pct = Math.round((actual / target) * 100);
            const remaining = Math.max(0, target - actual);

            const monthFr = MONTH_NAMES_FR[month - 1];
            const monthEn = MONTH_NAMES_EN[month - 1];
            const fmtTarget = Math.round(target).toLocaleString('fr-FR');
            const fmtActual = Math.round(actual).toLocaleString('fr-FR');
            const fmtRemaining = Math.round(remaining).toLocaleString('fr-FR');

            // Pick an emoji based on how the actual compares to the pro-rated expected
            const expectedPct = monthElapsed;
            let statusEmoji: string;
            let statusFr: string;
            let statusEn: string;
            if (pct >= 100) {
                statusEmoji = '🏆';
                statusFr = 'Objectif atteint !';
                statusEn = 'Objective reached!';
            } else if (pct >= expectedPct) {
                statusEmoji = '✅';
                statusFr = 'En avance sur l\'objectif';
                statusEn = 'Ahead of target';
            } else if (pct >= expectedPct - 15) {
                statusEmoji = '⚠️';
                statusFr = 'Légèrement en retard';
                statusEn = 'Slightly behind';
            } else {
                statusEmoji = '🔴';
                statusFr = 'En retard sur l\'objectif';
                statusEn = 'Behind target';
            }

            const titleEn = `${statusEmoji} Weekly CA Report — ${monthEn} ${year}`;
            const titleFr = `${statusEmoji} Rapport CA Hebdomadaire — ${monthFr} ${year}`;

            const bodyEn = [
                `Department: ${dept.name}`,
                `Objective: ${fmtTarget} FCFA`,
                `Achieved: ${fmtActual} FCFA (${pct}%)`,
                pct < 100 ? `Remaining: ${fmtRemaining} FCFA` : '',
                `Month progress: ${monthElapsed}% elapsed — ${statusEn}`,
            ].filter(Boolean).join('\n');

            const bodyFr = [
                `Département : ${dept.name}`,
                `Objectif : ${fmtTarget} FCFA`,
                `Réalisé : ${fmtActual} FCFA (${pct}%)`,
                pct < 100 ? `Reste à réaliser : ${fmtRemaining} FCFA` : '',
                `Avancement du mois : ${monthElapsed}% écoulé — ${statusFr}`,
            ].filter(Boolean).join('\n');

            await this.notificationsService.create({
                title: titleEn,
                body: bodyEn,
                titleFr,
                bodyFr,
                type: 'system',
                userId: dept.head.userId,
                meta: {
                    departmentId: dept.id,
                    year,
                    month,
                    targetRevenue: target,
                    actualRevenue: actual,
                    percentage: pct,
                    monthElapsed,
                },
            });

            sent++;
        }

        this.logger.log(`Sent ${sent} weekly CA reminder(s) for ${MONTH_NAMES_EN[month - 1]} ${year}`);
    }
}

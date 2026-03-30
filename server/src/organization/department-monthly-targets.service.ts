import { Injectable } from '@nestjs/common';
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
export class DepartmentMonthlyTargetsService {
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

    /** Create or update a monthly target for a department, then notify the HOD */
    async upsert(dto: { departmentId: string; year: number; month: number; targetRevenue: number }) {
        const existing = await this.monthlyTargetModel.findOne({
            where: { departmentId: dto.departmentId, year: dto.year, month: dto.month },
        });

        const isNew = !existing;
        let record: DepartmentMonthlyTarget;
        if (existing) {
            await existing.update({ targetRevenue: dto.targetRevenue });
            record = existing;
        } else {
            record = await this.monthlyTargetModel.create(dto as any);
        }

        // Notify HOD asynchronously
        this.notifyHodOnTargetSet(dto, isNew).catch(() => {});

        return record;
    }

    /** Send a notification to the department's HOD when a CA target is set */
    private async notifyHodOnTargetSet(
        dto: { departmentId: string; year: number; month: number; targetRevenue: number },
        isNew: boolean,
    ) {
        const department = await this.departmentModel.findByPk(dto.departmentId, {
            include: [{ model: Employee, as: 'head' }],
        });
        if (!department || !department.head) return;

        const hodUserId = department.head.userId;
        if (!hodUserId) return;

        const monthFr = MONTH_NAMES_FR[dto.month - 1];
        const monthEn = MONTH_NAMES_EN[dto.month - 1];
        const amount = Math.round(dto.targetRevenue).toLocaleString('fr-FR');
        const verb = isNew ? 'défini' : 'mis à jour';
        const verbEn = isNew ? 'set' : 'updated';

        await this.notificationsService.create({
            title: `🎯 CA Objective ${verbEn} — ${monthEn} ${dto.year}`,
            body: `The revenue objective for ${department.name} in ${monthEn} ${dto.year} has been ${verbEn} to ${amount} FCFA.`,
            titleFr: `🎯 Objectif CA ${verb} — ${monthFr} ${dto.year}`,
            bodyFr: `L'objectif de chiffre d'affaires du département ${department.name} pour ${monthFr} ${dto.year} a été ${verb} à ${amount} FCFA.`,
            type: 'system',
            userId: hodUserId,
            meta: {
                departmentId: dto.departmentId,
                year: dto.year,
                month: dto.month,
                targetRevenue: dto.targetRevenue,
            },
        });
    }

    /** Get the effective target for a given month.
     *  Priority: explicit monthly target (with carry-over) → department default → 0 */
    async getEffectiveTarget(departmentId: string, year: number, month: number): Promise<number> {
        const targets = await this.monthlyTargetModel.findAll({
            where: {
                departmentId,
                [Op.or]: [
                    { year: { [Op.lt]: year } },
                    { year, month: { [Op.lte]: month } },
                ],
            },
            order: [['year', 'DESC'], ['month', 'DESC']],
            limit: 1,
        });
        if (targets.length > 0) return Number(targets[0].targetRevenue);

        // Fall back to the department's default target
        const dept = await this.departmentModel.findByPk(departmentId, { attributes: ['defaultTargetRevenue'] });
        return dept?.defaultTargetRevenue != null ? Number(dept.defaultTargetRevenue) : 0;
    }

    /** Get actual revenue for a department in a given month from paid invoices */
    async getActualRevenue(departmentId: string, year: number, month: number): Promise<number> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const invoices = await this.invoiceModel.findAll({
            where: {
                departmentId,
                status: 'PAID',
                paidAt: { [Op.gte]: startDate, [Op.lt]: endDate },
            },
            attributes: ['total'],
        });
        return invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    }

    /** Get full monthly stats for a department/year: 12 rows with target + actual.
     *  Target resolution order: explicit monthly target (with carry-over) → department default → 0 */
    async getMonthlyStats(departmentId: string, year: number) {
        // Fetch explicit targets and department default in parallel
        const [allTargets, dept] = await Promise.all([
            this.monthlyTargetModel.findAll({
                where: { departmentId },
                order: [['year', 'ASC'], ['month', 'ASC']],
            }),
            this.departmentModel.findByPk(departmentId, { attributes: ['defaultTargetRevenue'] }),
        ]);

        const departmentDefault = dept?.defaultTargetRevenue != null ? Number(dept.defaultTargetRevenue) : 0;

        const targetMap = new Map<string, number>();
        allTargets.forEach(t => targetMap.set(`${t.year}-${t.month}`, Number(t.targetRevenue)));

        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        const paidInvoices = await this.invoiceModel.findAll({
            where: {
                departmentId,
                status: 'PAID',
                paidAt: { [Op.gte]: yearStart, [Op.lt]: yearEnd },
            },
            attributes: ['total', 'paidAt'],
        });

        const actualMap = new Map<number, number>();
        paidInvoices.forEach(inv => {
            const m = new Date(inv.paidAt!).getMonth() + 1;
            actualMap.set(m, (actualMap.get(m) || 0) + Number(inv.total));
        });

        const result: {
            month: number;
            targetRevenue: number;
            actualRevenue: number;
            hasExplicitTarget: boolean;
            usingDefault: boolean;
        }[] = [];

        // Seed carry-over: use the last explicit target set before this year, or the department default
        const prevYearTargets = allTargets.filter(t => t.year < year);
        let carryOver = prevYearTargets.length > 0
            ? Number(prevYearTargets[prevYearTargets.length - 1].targetRevenue)
            : departmentDefault;

        for (let m = 1; m <= 12; m++) {
            const key = `${year}-${m}`;
            const hasExplicitTarget = targetMap.has(key);
            if (hasExplicitTarget) {
                carryOver = targetMap.get(key)!;
            }
            // If carry-over is still 0 but there's a department default, use it
            const effectiveTarget = carryOver > 0 ? carryOver : departmentDefault;
            result.push({
                month: m,
                targetRevenue: effectiveTarget,
                actualRevenue: actualMap.get(m) || 0,
                hasExplicitTarget,
                usingDefault: !hasExplicitTarget && carryOver === 0 && departmentDefault > 0,
            });
        }

        return result;
    }

    /** Get all explicitly set targets for a department/year */
    getByDepartmentAndYear(departmentId: string, year: number) {
        return this.monthlyTargetModel.findAll({
            where: { departmentId, year },
            order: [['month', 'ASC']],
        });
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { CommercialGoal } from '../models/commercial-goal.model';
import { Employee } from '../models/employee.model';
import { Lead } from '../models/lead.model';
import { Invoice } from '../models/invoice.model';
import { User } from '../models/user.model';

@Injectable()
export class CommercialGoalsService {
    constructor(
        @InjectModel(CommercialGoal)
        private goalModel: typeof CommercialGoal,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Lead)
        private leadModel: typeof Lead,
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectModel(User)
        private userModel: typeof User,
    ) { }

    /** Create or update the monthly goal for a commercial. */
    async upsert(dto: { employeeId: string; year: number; month: number; targetAmount: number }) {
        const existing = await this.goalModel.findOne({
            where: { employeeId: dto.employeeId, year: dto.year, month: dto.month },
        });
        if (existing) {
            await existing.update({ targetAmount: dto.targetAmount });
            return existing;
        }
        return this.goalModel.create(dto as any);
    }

    /**
     * Compute the actual CA (paid invoice revenue) for a commercial employee
     * for a given year/month.
     */
    private async computeCA(employeeId: string, year: number, month: number): Promise<number> {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        // Invoices are linked to clients converted from this commercial's leads
        const convertedLeads = await this.leadModel.findAll({
            where: { assignedToId: employeeId, clientId: { [Op.ne]: null } },
            attributes: ['clientId'],
        });
        const clientIds = [...new Set(convertedLeads.map(l => l.clientId).filter(Boolean))];
        if (clientIds.length === 0) return 0;

        const invoices = await this.invoiceModel.findAll({
            where: {
                status: 'PAID',
                clientId: { [Op.in]: clientIds },
                paidAt: { [Op.between]: [start, end] },
            },
            attributes: ['total'],
        });

        return invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    }

    /**
     * Return all commercials with their actual CA vs monthly goal.
     * Used by managers.
     */
    async getTeamPerformance(year: number, month: number) {
        // Find all COMMERCIAL-role users
        const commercialUsers = await this.userModel.findAll({
            where: { role: 'COMMERCIAL' },
            attributes: ['id'],
        });
        const userIds = commercialUsers.map(u => u.id);

        const employees = await this.employeeModel.findAll({
            where: { userId: { [Op.in]: userIds } },
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'userId'],
        });

        // Load goals for this period
        const goals = await this.goalModel.findAll({
            where: { year, month, employeeId: { [Op.in]: employees.map(e => e.id) } },
        });
        const goalsMap = new Map(goals.map(g => [g.employeeId, g]));

        // Compute CA per commercial (in parallel)
        const results = await Promise.all(
            employees.map(async (emp) => {
                const ca = await this.computeCA(emp.id, year, month);
                const goal = goalsMap.get(emp.id);
                const target = goal ? Number(goal.targetAmount) : null;
                return {
                    employeeId: emp.id,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    avatarUrl: (emp as any).avatarUrl ?? null,
                    targetAmount: target,
                    actualCA: Math.round(ca),
                    progress: target && target > 0 ? Math.min(Math.round((ca / target) * 100), 999) : null,
                };
            }),
        );

        return results;
    }

    /**
     * Return the goal + actual CA for a single commercial for the given period.
     * Used by the commercial themselves on their dashboard.
     */
    async getMyGoal(employeeId: string, year: number, month: number) {
        if (!employeeId) return { targetAmount: null, actualCA: 0, progress: null, year, month };

        const goal = await this.goalModel.findOne({ where: { employeeId, year, month } });
        const ca = await this.computeCA(employeeId, year, month);
        const target = goal ? Number(goal.targetAmount) : null;

        return {
            targetAmount: target,
            actualCA: Math.round(ca),
            progress: target && target > 0 ? Math.min(Math.round((ca / target) * 100), 999) : null,
            year,
            month,
        };
    }
}

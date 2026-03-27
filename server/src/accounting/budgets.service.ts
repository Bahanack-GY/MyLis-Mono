import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Budget } from '../models/budget.model';
import { Account } from '../models/account.model';
import { Department } from '../models/department.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { ReportsService } from './reports.service';

@Injectable()
export class BudgetsService {
    constructor(
        @InjectModel(Budget)
        private budgetModel: typeof Budget,
        private reportsService: ReportsService,
    ) {}

    async findAll(fiscalYearId: string) {
        return this.budgetModel.findAll({
            where: { fiscalYearId },
            include: [
                { model: Account, attributes: ['id', 'code', 'name'] },
                { model: Department, attributes: ['id', 'name'] },
                { model: FiscalYear, attributes: ['id', 'name'] },
            ],
            order: [['createdAt', 'ASC']],
        });
    }

    async findOne(id: string) {
        const budget = await this.budgetModel.findByPk(id, {
            include: [Account, Department, FiscalYear],
        });
        if (!budget) throw new NotFoundException('Budget not found');
        return budget;
    }

    async create(dto: any) {
        const monthlyAmounts = dto.monthlyAmounts || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const annualTotal = monthlyAmounts.reduce((sum: number, m: number) => sum + (Number(m) || 0), 0);
        return this.budgetModel.create({
            ...dto,
            monthlyAmounts,
            annualTotal: Math.round(annualTotal * 100) / 100,
        } as any);
    }

    async update(id: string, dto: any) {
        const budget = await this.findOne(id);
        if (dto.monthlyAmounts) {
            dto.annualTotal = dto.monthlyAmounts.reduce((sum: number, m: number) => sum + (Number(m) || 0), 0);
            dto.annualTotal = Math.round(dto.annualTotal * 100) / 100;
        }
        return budget.update(dto);
    }

    async remove(id: string) {
        const budget = await this.findOne(id);
        await budget.destroy();
        return { deleted: true };
    }

    /**
     * Budget vs Actual variance analysis
     */
    async variance(fiscalYearId: string) {
        const budgets = await this.findAll(fiscalYearId);
        const trial = await this.reportsService.trialBalance(fiscalYearId);

        // Create lookup of actual amounts by account
        const actualByAccount = new Map<string, number>();
        for (const item of trial.accounts) {
            // For expense accounts, use debit balance; for revenue, use credit balance
            const amount = item.account.type === 'EXPENSE'
                ? (item.debitBalance || 0)
                : item.account.type === 'REVENUE'
                    ? (item.creditBalance || 0)
                    : (item.debitBalance || 0) - (item.creditBalance || 0);
            actualByAccount.set(item.account.id, amount);
        }

        return budgets.map(b => {
            const plain = b.get({ plain: true }) as any;
            const actual = plain.accountId ? (actualByAccount.get(plain.accountId) || 0) : 0;
            const budgeted = plain.annualTotal;
            const variance = budgeted - actual;
            const variancePercent = budgeted > 0 ? Math.round((variance / budgeted) * 10000) / 100 : 0;

            return {
                ...plain,
                actual: Math.round(actual * 100) / 100,
                variance: Math.round(variance * 100) / 100,
                variancePercent,
                status: actual > budgeted * 1.0 ? 'OVER' : actual > budgeted * 0.8 ? 'WARNING' : 'OK',
            };
        });
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Expense } from '../models/expense.model';
import { Project } from '../models/project.model';
import { Department } from '../models/department.model';
import { TaxDeclaration } from '../models/tax-declaration.model';
import { JournalEngineService } from '../accounting/journal-engine.service';
import { Op } from 'sequelize';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectModel(Expense)
        private expenseModel: typeof Expense,
        @InjectModel(Project)
        private projectModel: typeof Project,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectModel(TaxDeclaration)
        private taxDeclarationModel: typeof TaxDeclaration,
        private journalEngine: JournalEngineService,
    ) { }

    async create(createExpenseDto: any, userId?: string) {
        const expense = await this.expenseModel.create(createExpenseDto);

        // Payroll-generated expenses have their own journal entries via onSalaryPaid
        if (expense.source !== 'PAYROLL' && userId) {
            await this.journalEngine.onExpenseCreated(expense, userId);
        }

        // When TVA is paid, mark the corresponding TVA declaration as FILED
        if (expense.chargeNature === 'TVA & taxes reversées') {
            await this.linkTvaPaymentToDeclaration(String(expense.date));
        }

        return expense;
    }

    private async linkTvaPaymentToDeclaration(date: string) {
        try {
            const [year, month] = date.split('-');
            const period = `${year}-${month}`;
            const decl = await this.taxDeclarationModel.findOne({
                where: { type: 'TVA_MONTHLY', period },
            });
            if (decl && decl.status === 'VALIDATED') {
                await decl.update({ status: 'FILED', filedAt: new Date() });
            }
        } catch {
            // Non-blocking — TVA link failure should not prevent expense creation
        }
    }

    async findAll(projectId?: string, departmentId?: string, page = 1, limit = 10) {
        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (departmentId) where.departmentId = departmentId;
        const offset = (page - 1) * limit;
        const { count, rows } = await this.expenseModel.findAndCountAll({
            where,
            include: [
                { model: Project, attributes: ['id', 'name'], required: false },
                { model: Department, attributes: ['id', 'name'], required: false },
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
            limit,
            offset,
        });
        return {
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
    }

    async findOne(id: string) {
        const expense = await this.expenseModel.findByPk(id);
        if (!expense) throw new NotFoundException('Expense not found');
        return expense;
    }

    async update(id: string, updateExpenseDto: any, userId?: string) {
        const expense = await this.findOne(id);
        await expense.update(updateExpenseDto);
        if (userId) {
            await this.journalEngine.onExpenseUpdated(expense, userId);
        }
        return expense;
    }

    async remove(id: string) {
        const expense = await this.findOne(id);
        await this.journalEngine.onExpenseDeleted(expense.id);
        await expense.destroy();
        return { success: true };
    }

    async getStats(year?: number, departmentId?: string) {
        const currentYear = year || new Date().getFullYear();
        const startDate = `${currentYear}-01-01`;
        const endDate = `${currentYear}-12-31`;

        const expenseWhere: any = { date: { [Op.between]: [startDate, endDate] } };
        if (departmentId) {
            expenseWhere.departmentId = departmentId;
        }

        const expenses = await this.expenseModel.findAll({ where: expenseWhere });

        // Salary expenses from payroll (chargeFamily = CHARGES_PERSONNEL, source = PAYROLL)
        const salaryExpenses = expenses.filter(e => e.source === 'PAYROLL');
        const totalSalaries = salaryExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Projects budget distribution
        const projectWhere: any = {
            budget: { [Op.gt]: 0 },
            startDate: { [Op.lte]: new Date(`${currentYear}-12-31`) },
            endDate: { [Op.gte]: new Date(`${currentYear}-01-01`) },
        };
        if (departmentId) projectWhere.departmentId = departmentId;

        const projects = await this.projectModel.findAll({
            where: projectWhere,
            attributes: ['budget', 'startDate', 'endDate'],
            raw: true,
        });

        const projectByMonth = new Array(12).fill(0);
        let totalProjects = 0;
        projects.forEach(p => {
            const budget = Number(p.budget) || 0;
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            const totalMonths = Math.max(1,
                (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1,
            );
            const monthlyBudget = budget / totalMonths;
            const firstMonth = pStart.getFullYear() < currentYear ? 0 : pStart.getMonth();
            const lastMonth = pEnd.getFullYear() > currentYear ? 11 : pEnd.getMonth();
            for (let m = firstMonth; m <= lastMonth; m++) {
                projectByMonth[m] += monthlyBudget;
                totalProjects += monthlyBudget;
            }
        });

        // Group by chargeNature for chart series (use chargeFamily as display grouping)
        const byFamily: Record<string, number> = {};
        const byNature: Record<string, number> = {};
        const allNatures = new Set<string>();

        const byMonth: Record<string, any>[] = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(2000, i, 1).toLocaleString('fr-FR', { month: 'short' }),
            Projets: Math.round(projectByMonth[i]),
            total: 0,
        }));

        let totalYear = 0;
        let recurrentCount = 0;

        expenses.forEach(e => {
            const amount = Number(e.amount);
            totalYear += amount;
            if (e.type === 'RECURRENT') recurrentCount++;

            const nature = e.chargeNature || 'Autre';
            const family = e.chargeFamily || 'CHARGES_OPERATIONNELLES';
            allNatures.add(nature);

            byNature[nature] = (byNature[nature] || 0) + amount;
            byFamily[family] = (byFamily[family] || 0) + amount;

            const dateStr = String(e.date);
            const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                byMonth[monthIndex].total += amount;
                byMonth[monthIndex][nature] = (byMonth[monthIndex][nature] || 0) + amount;
            }
        });

        const natures = Array.from(allNatures).sort();
        byMonth.forEach(month => {
            natures.forEach(n => { if (month[n] === undefined) month[n] = 0; });
        });

        const categoryData = Object.entries(byNature)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value));

        const familyData = Object.entries(byFamily)
            .map(([code, value]) => ({ code, value }))
            .sort((a, b) => Number(b.value) - Number(a.value));

        const series = ['Salaires', 'Projets', ...categoryData.map(c => c.name)];

        return {
            totalYear,
            totalCount: expenses.length,
            recurrentCount,
            totalSalaries,
            totalProjects: Math.round(totalProjects),
            byCategory: categoryData,
            byFamily: familyData,
            byMonth,
            series,
        };
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Expense } from '../models/expense.model';
import { Project } from '../models/project.model';
import { Op } from 'sequelize';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectModel(Expense)
        private expenseModel: typeof Expense,
        @InjectModel(Project)
        private projectModel: typeof Project,
    ) { }

    async create(createExpenseDto: any) {
        return this.expenseModel.create(createExpenseDto);
    }

    async findAll(projectId?: string, page = 1, limit = 10) {
        const where: any = {};
        if (projectId) where.projectId = projectId;
        const offset = (page - 1) * limit;
        const { count, rows } = await this.expenseModel.findAndCountAll({
            where,
            include: [{ model: Project, attributes: ['id', 'name'], required: false }],
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

    async update(id: string, updateExpenseDto: any) {
        const expense = await this.findOne(id);
        return expense.update(updateExpenseDto);
    }

    async remove(id: string) {
        const expense = await this.findOne(id);
        await expense.destroy();
        return { success: true };
    }

    async getStats(year?: number) {
        const currentYear = year || new Date().getFullYear();
        const startDate = `${currentYear}-01-01`;
        const endDate = `${currentYear}-12-31`;

        const expenses = await this.expenseModel.findAll({
            where: {
                date: {
                    [Op.between]: [startDate, endDate],
                },
            },
        });

        // Sum of salary expenses that were actually paid (category = 'Salaire') in this year
        const salaryExpenses = expenses.filter(e => e.category === 'Salaire');
        const totalSalaries = salaryExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Projects that overlap with the selected year
        const projects = await this.projectModel.findAll({
            where: {
                budget: { [Op.gt]: 0 },
                startDate: { [Op.lte]: new Date(`${currentYear}-12-31`) },
                endDate: { [Op.gte]: new Date(`${currentYear}-01-01`) },
            },
            attributes: ['budget', 'startDate', 'endDate'],
            raw: true,
        });

        // Distribute each project's budget across its months within the year
        const projectByMonth = new Array(12).fill(0);
        let totalProjects = 0;
        projects.forEach(p => {
            const budget = Number(p.budget) || 0;
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            // Total months the project spans
            const totalMonths = Math.max(1,
                (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1,
            );
            const monthlyBudget = budget / totalMonths;

            // Clamp to current year
            const firstMonth = pStart.getFullYear() < currentYear ? 0 : pStart.getMonth();
            const lastMonth = pEnd.getFullYear() > currentYear ? 11 : pEnd.getMonth();
            for (let m = firstMonth; m <= lastMonth; m++) {
                projectByMonth[m] += monthlyBudget;
                totalProjects += monthlyBudget;
            }
        });

        const byCategory: Record<string, number> = {};
        const allCategories = new Set<string>();

        // Build monthly breakdown with per-category columns
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

            const cat = e.category || 'Autre';
            allCategories.add(cat);

            if (!byCategory[cat]) byCategory[cat] = 0;
            byCategory[cat] += amount;

            const dateStr = String(e.date);
            const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                byMonth[monthIndex].total += amount;
                byMonth[monthIndex][cat] = (byMonth[monthIndex][cat] || 0) + amount;
            }
        });

        // Ensure all months have all category keys (default 0)
        const categories = Array.from(allCategories).sort();
        byMonth.forEach(month => {
            categories.forEach(cat => {
                if (month[cat] === undefined) month[cat] = 0;
            });
        });

        const categoryData = Object.entries(byCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => Number(b.value) - Number(a.value));

        // Series list: Salaires, Projets, then expense categories sorted by total
        const series = ['Salaires', 'Projets', ...categoryData.map(c => c.name)];

        return {
            totalYear,
            totalCount: expenses.length,
            recurrentCount,
            totalSalaries,
            totalProjects: Math.round(totalProjects),
            byCategory: categoryData,
            byMonth,
            series,
        };
    }
}

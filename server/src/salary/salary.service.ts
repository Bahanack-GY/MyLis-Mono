import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Expense } from '../models/expense.model';

@Injectable()
export class SalaryService {
    constructor(
        @InjectModel(Employee) private employeeModel: typeof Employee,
        @InjectModel(Expense) private expenseModel: typeof Expense,
    ) {}

    async findAll() {
        const employees = await this.employeeModel.findAll({
            where: { dismissed: false },
            include: [
                { model: User, attributes: ['role'] },
                { model: Department, attributes: ['id', 'name'] },
            ],
            order: [['firstName', 'ASC']],
        });
        return employees.map(e => {
            const plain = e.get({ plain: true }) as any;
            return {
                id: plain.id,
                firstName: plain.firstName || '',
                lastName: plain.lastName || '',
                departmentId: plain.departmentId || null,
                departmentName: plain.department?.name || '',
                role: plain.user?.role || 'EMPLOYEE',
                salary: Number(plain.salary) || 0,
            };
        });
    }

    async updateSalary(employeeId: string, salary: number) {
        const employee = await this.employeeModel.findByPk(employeeId);
        if (!employee) throw new NotFoundException('Employee not found');
        await employee.update({ salary });
        return { id: employeeId, salary };
    }

    async payOne(employeeId: string, month: number, year: number) {
        const employee = await this.employeeModel.findByPk(employeeId);
        if (!employee) throw new NotFoundException('Employee not found');
        const salary = Number(employee.getDataValue('salary')) || 0;
        if (salary === 0) throw new BadRequestException('Employee has no salary set');

        const date = `${year}-${String(month).padStart(2, '0')}-01`;
        const name = `${employee.getDataValue('firstName') || ''} ${employee.getDataValue('lastName') || ''}`.trim();
        const title = `Salaire - ${name}`;

        const existing = await this.expenseModel.findOne({
            where: { title, category: 'Salaire', date } as any,
        });
        if (existing) throw new BadRequestException(`Salary for ${name} in ${month}/${year} has already been paid`);

        await this.expenseModel.create({ title, amount: salary, category: 'Salaire', type: 'ONE_TIME', date } as any);

        return { employeeId, name, amount: salary, month, year };
    }

    async payAdvance(employeeId: string, amount: number, note?: string) {
        const employee = await this.employeeModel.findByPk(employeeId);
        if (!employee) throw new NotFoundException('Employee not found');

        const name = `${employee.getDataValue('firstName') || ''} ${employee.getDataValue('lastName') || ''}`.trim();
        const date = new Date().toISOString().split('T')[0];

        await this.expenseModel.create({
            title: `Avance sur salaire - ${name}${note ? ` (${note})` : ''}`,
            amount,
            category: 'Avance sur salaire',
            type: 'ONE_TIME',
            date,
        } as any);

        return { employeeId, name, amount, date };
    }

    async payBulk(month: number, year: number) {
        const employees = await this.employeeModel.findAll({
            where: { dismissed: false },
        });

        const payable = employees.filter(e => (Number(e.getDataValue('salary')) || 0) > 0);
        if (payable.length === 0) return { created: 0, total: 0 };

        const date = `${year}-${String(month).padStart(2, '0')}-01`;

        // Build all expense titles and filter out already-paid ones
        const allExpenseData = payable.map(e => ({
            title: `Salaire - ${e.getDataValue('firstName') || ''} ${e.getDataValue('lastName') || ''}`.trim(),
            amount: Number(e.getDataValue('salary')),
            category: 'Salaire',
            type: 'ONE_TIME',
            date,
        }));

        const existingTitles = await this.expenseModel.findAll({
            where: { title: { [Op.in]: allExpenseData.map(e => e.title) }, category: 'Salaire', date } as any,
            attributes: ['title'],
        });
        const paidSet = new Set((existingTitles as any[]).map(e => e.title));
        const expenseData = allExpenseData.filter(e => !paidSet.has(e.title));

        if (expenseData.length === 0) throw new BadRequestException(`All salaries for ${month}/${year} have already been paid`);

        await this.expenseModel.bulkCreate(expenseData as any[]);

        const total = expenseData.reduce((sum, e) => sum + e.amount, 0);
        return { created: expenseData.length, skipped: paidSet.size, total, month, year };
    }
}

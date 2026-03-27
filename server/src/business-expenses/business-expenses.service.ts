import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BusinessExpense } from '../models/business-expense.model';
import { BusinessExpenseType } from '../models/business-expense-type.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Op } from 'sequelize';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class BusinessExpensesService {
    constructor(
        @InjectModel(BusinessExpense) private businessExpenseModel: typeof BusinessExpense,
        @InjectModel(BusinessExpenseType) private businessExpenseTypeModel: typeof BusinessExpenseType,
        @InjectModel(Employee) private employeeModel: typeof Employee,
        @InjectModel(User) private userModel: typeof User,
        private notificationsService: NotificationsService,
        private expensesService: ExpensesService,
    ) {}

    /* ── Type CRUD ── */

    createType(dto: any) {
        return this.businessExpenseTypeModel.create(dto);
    }

    findAllTypes() {
        return this.businessExpenseTypeModel.findAll({ order: [['name', 'ASC']] });
    }

    async updateType(id: string, dto: any) {
        const type = await this.businessExpenseTypeModel.findByPk(id);
        if (!type) return null;
        await type.update(dto);
        return type;
    }

    async removeType(id: string) {
        const type = await this.businessExpenseTypeModel.findByPk(id);
        if (type) await type.destroy();
    }

    /* ── Business Expense CRUD ── */

    async create(dto: any, userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const expense = await this.businessExpenseModel.create({
            amount: dto.amount,
            date: dto.date,
            description: dto.description || null,
            receiptPath: dto.receiptPath || null,
            typeId: dto.typeId,
            employeeId: employee.getDataValue('id'),
            status: 'PENDING',
        });

        const employeeName = `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`.trim();
        const approvers = await this.userModel.findAll({
            where: { role: { [Op.in]: ['MANAGER', 'ACCOUNTANT'] } },
            attributes: ['id'],
        });
        if (approvers.length > 0) {
            await this.notificationsService.createMany(
                approvers.map(u => ({
                    title: 'New business expense submitted',
                    body: `${employeeName} submitted a business expense of ${new Intl.NumberFormat('fr-FR').format(dto.amount)} FCFA`,
                    titleFr: 'Nouveaux frais de vie soumis',
                    bodyFr: `${employeeName} a soumis des frais de vie de ${new Intl.NumberFormat('fr-FR').format(dto.amount)} FCFA`,
                    type: 'business_expense',
                    userId: u.getDataValue('id'),
                })),
            );
        }

        return this.findOne(expense.getDataValue('id'));
    }

    async findAll(filters?: { status?: string; typeId?: string; employeeId?: string; from?: string; to?: string }) {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.typeId) where.typeId = filters.typeId;
        if (filters?.employeeId) where.employeeId = filters.employeeId;
        if (filters?.from || filters?.to) {
            where.date = {};
            if (filters.from) where.date[Op.gte] = filters.from;
            if (filters.to) where.date[Op.lte] = filters.to;
        }

        return this.businessExpenseModel.findAll({
            where,
            include: [
                { model: Employee, attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'userId'] },
                { model: BusinessExpenseType, attributes: ['id', 'name', 'color'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findByEmployee(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        return this.findAll({ employeeId: employee.getDataValue('id') });
    }

    async findByEmployeeId(employeeId: string) {
        return this.findAll({ employeeId });
    }

    async findOne(id: string) {
        const expense = await this.businessExpenseModel.findByPk(id, {
            include: [
                { model: Employee, attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'userId'] },
                { model: BusinessExpenseType, attributes: ['id', 'name', 'color'] },
                { model: User, as: 'validatedBy', attributes: ['id', 'email'] },
            ],
        });
        if (!expense) throw new NotFoundException('Business expense not found');
        return expense;
    }

    async validate(id: string, validatorUserId: string) {
        const expense = await this.findOne(id);
        const status = expense.getDataValue('status');
        if (status === 'VALIDATED') return expense;
        if (status !== 'PENDING') throw new BadRequestException('Only PENDING expenses can be validated');

        const employee = expense.employee;
        const typeName = expense.expenseType?.name || 'Frais de vie';
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';

        const createdExpense = await this.expensesService.create({
            title: `Frais de vie: ${employeeName} - ${typeName}`,
            amount: parseFloat(expense.getDataValue('amount')) || 0,
            category: 'Frais de vie',
            type: 'ONE_TIME',
            date: expense.getDataValue('date'),
        });

        await this.businessExpenseModel.update(
            {
                status: 'VALIDATED',
                validatedAt: new Date(),
                validatedById: validatorUserId,
                expenseId: createdExpense.getDataValue('id'),
            },
            { where: { id } },
        );

        if (employee?.userId) {
            await this.notificationsService.createMany([{
                title: 'Business expense validated',
                body: 'Your business expense has been validated.',
                titleFr: 'Frais de vie validés',
                bodyFr: 'Vos frais de vie ont été validés.',
                type: 'business_expense',
                userId: employee.userId,
            }]);
        }

        return this.findOne(id);
    }

    async reject(id: string, reason?: string) {
        const expense = await this.findOne(id);
        const status = expense.getDataValue('status');
        if (status === 'REJECTED') return expense;
        if (status !== 'PENDING') throw new BadRequestException('Only PENDING expenses can be rejected');

        await this.businessExpenseModel.update(
            { status: 'REJECTED', rejectionReason: reason || null },
            { where: { id } },
        );

        const employee = expense.employee;
        if (employee?.userId) {
            await this.notificationsService.createMany([{
                title: 'Business expense rejected',
                body: `Your business expense has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
                titleFr: 'Frais de vie rejetés',
                bodyFr: `Vos frais de vie ont été rejetés.${reason ? ` Raison : ${reason}` : ''}`,
                type: 'business_expense',
                userId: employee.userId,
            }]);
        }

        return this.findOne(id);
    }

    async remove(id: string, userId: string) {
        const expense = await this.findOne(id);
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee || expense.getDataValue('employeeId') !== employee.getDataValue('id')) {
            throw new ForbiddenException('You can only delete your own expenses');
        }
        if (expense.getDataValue('status') !== 'PENDING') {
            throw new BadRequestException('Only PENDING expenses can be deleted');
        }
        await expense.destroy();
        return { success: true };
    }

    async getStats(employeeId?: string) {
        const where: any = {};
        if (employeeId) where.employeeId = employeeId;

        const all = await this.businessExpenseModel.findAll({ where, raw: true });
        const totalPending = all.filter((e: any) => e.status === 'PENDING').length;
        const totalValidated = all.filter((e: any) => e.status === 'VALIDATED').length;
        const totalRejected = all.filter((e: any) => e.status === 'REJECTED').length;
        const totalAmount = all
            .filter((e: any) => e.status === 'VALIDATED')
            .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);

        return { total: all.length, totalPending, totalValidated, totalRejected, totalAmount };
    }
}

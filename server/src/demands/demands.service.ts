
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Demand } from '../models/demand.model';
import { DemandItem } from '../models/demand-item.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { Op } from 'sequelize';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class DemandsService {
    constructor(
        @InjectModel(Demand)
        private demandModel: typeof Demand,
        @InjectModel(DemandItem)
        private demandItemModel: typeof DemandItem,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(User)
        private userModel: typeof User,
        @InjectConnection()
        private sequelize: Sequelize,
        private notificationsService: NotificationsService,
        private expensesService: ExpensesService,
    ) { }

    async create(createDemandDto: any, userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const items: { name: string; quantity: number; unitPrice: number; imageUrl?: string }[] = createDemandDto.items || [];
        const totalPrice = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);

        const demand = await this.sequelize.transaction(async (t) => {
            const d = await this.demandModel.create({
                proformaUrl: createDemandDto.proformaUrl || null,
                importance: createDemandDto.importance || 'IMPORTANT',
                totalPrice,
                employeeId: employee.getDataValue('id'),
                departmentId: employee.getDataValue('departmentId'),
                status: 'PENDING',
            }, { transaction: t });

            if (items.length > 0) {
                await this.demandItemModel.bulkCreate(
                    items.map(item => ({
                        demandId: d.getDataValue('id'),
                        name: item.name,
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0,
                        imageUrl: item.imageUrl || null,
                    })),
                    { transaction: t },
                );
            }
            return d;
        });

        // Notify managers after commit
        const employeeName = `${employee.getDataValue('firstName')} ${employee.getDataValue('lastName')}`.trim();
        const managers = await this.userModel.findAll({ where: { role: 'MANAGER' }, attributes: ['id'] });
        if (managers.length > 0) {
            await this.notificationsService.createMany(
                managers.map(m => ({
                    title: 'New demand submitted',
                    body: `${employeeName} submitted a demand for ${new Intl.NumberFormat('fr-FR').format(totalPrice)} FCFA`,
                    titleFr: 'Nouvelle demande soumise',
                    bodyFr: `${employeeName} a soumis une demande de ${new Intl.NumberFormat('fr-FR').format(totalPrice)} FCFA`,
                    type: 'demand',
                    userId: m.getDataValue('id'),
                })),
            );
        }

        return this.findOne(demand.getDataValue('id'));
    }

    async findAll(departmentId?: string) {
        const where: any = {};
        if (departmentId) where.departmentId = departmentId;

        return this.demandModel.findAll({
            where,
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'userId'],
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                },
                {
                    model: DemandItem,
                    as: 'items',
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findByEmployee(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];

        return this.demandModel.findAll({
            where: { employeeId: employee.getDataValue('id') },
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                },
                {
                    model: DemandItem,
                    as: 'items',
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string) {
        const demand = await this.demandModel.findByPk(id, {
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'userId'],
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name'],
                },
                {
                    model: DemandItem,
                    as: 'items',
                },
            ],
        });
        if (!demand) throw new NotFoundException('Demand not found');
        return demand;
    }

    async validate(id: string) {
        const demand = await this.findOne(id);
        const status = demand.getDataValue('status');
        // Idempotent: already validated
        if (status === 'VALIDATED') return demand;
        if (status !== 'PENDING') {
            throw new BadRequestException('Only PENDING demands can be validated');
        }

        await this.demandModel.update(
            { status: 'VALIDATED', validatedAt: new Date() },
            { where: { id } },
        );

        const employee = demand.employee;
        if (employee?.userId) {
            await this.notificationsService.createMany([{
                title: 'Demand validated',
                body: `Your demand has been validated.`,
                titleFr: 'Demande validée',
                bodyFr: `Votre demande a été validée.`,
                type: 'demand',
                userId: employee.userId,
            }]);
        }

        // Auto-create expense
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
        await this.expensesService.create({
            title: `Demande: ${employeeName}`,
            amount: parseFloat(demand.getDataValue('totalPrice')) || 0,
            category: 'Demande',
            type: 'ONE_TIME',
            date: new Date().toISOString().split('T')[0],
            demandId: id,
        });

        return this.findOne(id);
    }

    async reject(id: string, reason?: string) {
        const demand = await this.findOne(id);
        const status = demand.getDataValue('status');
        // Idempotent: already rejected
        if (status === 'REJECTED') return demand;
        if (status !== 'PENDING') {
            throw new BadRequestException('Only PENDING demands can be rejected');
        }

        await this.demandModel.update(
            { status: 'REJECTED', rejectionReason: reason || null },
            { where: { id } },
        );

        const employee = demand.employee;
        if (employee?.userId) {
            await this.notificationsService.createMany([{
                title: 'Demand rejected',
                body: `Your demand has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
                titleFr: 'Demande rejetée',
                bodyFr: `Votre demande a été rejetée.${reason ? ` Raison : ${reason}` : ''}`,
                type: 'demand',
                userId: employee.userId,
            }]);
        }

        return this.findOne(id);
    }

    async getStats(departmentId?: string, from?: string, to?: string) {
        const where: any = {};
        if (departmentId) where.departmentId = departmentId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt[Op.gte] = new Date(from);
            if (to) where.createdAt[Op.lte] = new Date(to);
        }

        const all = await this.demandModel.findAll({ where, raw: true });

        const totalPending = all.filter((d: any) => d.status === 'PENDING').length;
        const totalValidated = all.filter((d: any) => d.status === 'VALIDATED').length;
        const totalRejected = all.filter((d: any) => d.status === 'REJECTED').length;
        const totalExpense = all
            .filter((d: any) => d.status === 'VALIDATED')
            .reduce((sum: number, d: any) => sum + parseFloat(d.totalPrice || 0), 0);

        return { totalPending, totalValidated, totalRejected, totalExpense, total: all.length };
    }
}

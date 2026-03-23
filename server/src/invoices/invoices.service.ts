import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Invoice } from '../models/invoice.model';
import { InvoiceItem } from '../models/invoice-item.model';
import { Project } from '../models/project.model';
import { Department } from '../models/department.model';
import { Client } from '../models/client.model';
import { User } from '../models/user.model';
import { DepartmentGoalsService } from '../organization/department-goals.service';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectModel(InvoiceItem)
        private invoiceItemModel: typeof InvoiceItem,
        @InjectConnection()
        private sequelize: Sequelize,
        private departmentGoalsService: DepartmentGoalsService,
    ) { }

    private async generateInvoiceNumber(): Promise<string> {
        // Use a transaction with SERIALIZABLE isolation to prevent race conditions
        return this.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' as any }, async (t) => {
            const year = new Date().getFullYear();
            const prefix = `INV-${year}-`;
            const lastInvoice = await this.invoiceModel.findOne({
                where: { invoiceNumber: { [Op.like]: `${prefix}%` } },
                order: [['invoiceNumber', 'DESC']],
                lock: true,
                transaction: t,
            });
            const nextNum = lastInvoice
                ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(4, '0')}`;
        });
    }

    async create(dto: any, userId: string): Promise<Invoice> {
        const invoiceNumber = await this.generateInvoiceNumber();

        const items = dto.items || [];
        const subtotal = items.reduce((sum: number, item: any) => {
            return sum + (Number(item.quantity) * Number(item.unitPrice));
        }, 0);
        const taxRate = Number(dto.taxRate) || 0;
        const taxAmount = Math.round(subtotal * taxRate) / 100;
        const total = subtotal + taxAmount;

        const invoice = await this.sequelize.transaction(async (t) => {
            const inv = await this.invoiceModel.create({
                invoiceNumber,
                status: 'CREATED',
                projectId: dto.projectId,
                departmentId: dto.departmentId,
                clientId: dto.clientId,
                createdById: userId,
                issueDate: dto.issueDate || new Date(),
                dueDate: dto.dueDate,
                subtotal,
                taxRate,
                taxAmount,
                total,
                notes: dto.notes,
                customColumns: dto.customColumns || null,
            }, { transaction: t });

            if (items.length > 0) {
                await this.invoiceItemModel.bulkCreate(
                    items.map((item: any) => ({
                        invoiceId: inv.id,
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                        amount: Number(item.quantity) * Number(item.unitPrice),
                        metadata: item.metadata || null,
                    })),
                    { transaction: t },
                );
            }

            return inv;
        });

        return this.findOne(invoice.id);
    }

    async findAll(departmentId?: string): Promise<Invoice[]> {
        const where: any = {};
        if (departmentId) where.departmentId = departmentId;
        return this.invoiceModel.findAll({
            where,
            include: [Project, Department, Client, { model: User, as: 'createdBy' }, InvoiceItem],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceModel.findByPk(id, {
            include: [Project, Department, Client, { model: User, as: 'createdBy' }, InvoiceItem],
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    async update(id: string, dto: any): Promise<Invoice> {
        const invoice = await this.findOne(id);
        if (invoice.status !== 'CREATED') {
            throw new BadRequestException('Can only edit invoices with CREATED status');
        }

        // Recompute items if provided — wrapped in a transaction to prevent partial state
        if (dto.items) {
            await this.sequelize.transaction(async (t) => {
                await this.invoiceItemModel.destroy({ where: { invoiceId: id }, transaction: t });
                const items = dto.items;
                const subtotal = items.reduce((sum: number, item: any) => {
                    return sum + (Number(item.quantity) * Number(item.unitPrice));
                }, 0);
                const taxRate = dto.taxRate !== undefined ? Number(dto.taxRate) : Number(invoice.taxRate);
                const taxAmount = Math.round(subtotal * taxRate) / 100;
                const total = subtotal + taxAmount;

                await this.invoiceItemModel.bulkCreate(
                    items.map((item: any) => ({
                        invoiceId: id,
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                        amount: Number(item.quantity) * Number(item.unitPrice),
                    })),
                    { transaction: t },
                );

                dto.subtotal = subtotal;
                dto.taxRate = taxRate;
                dto.taxAmount = taxAmount;
                dto.total = total;
                delete dto.items;

                await invoice.update(dto, { transaction: t });
            });
            return this.findOne(id);
        }

        await invoice.update(dto);
        return this.findOne(id);
    }

    async send(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        // Idempotent: already sent
        if (invoice.status === 'SENT') return invoice;
        if (invoice.status !== 'CREATED') {
            throw new BadRequestException('Can only send invoices with CREATED status');
        }
        await invoice.update({ status: 'SENT', sentAt: new Date() });
        return this.findOne(id);
    }

    async markPaid(id: string): Promise<Invoice> {
        await this.sequelize.transaction(async (t) => {
            // Re-fetch inside the transaction with a row lock to prevent race conditions
            const invoice = await this.invoiceModel.findByPk(id, { lock: true, transaction: t });
            if (!invoice) throw new NotFoundException('Invoice not found');
            // Idempotent: already paid
            if (invoice.status === 'PAID') return;
            if (invoice.status !== 'SENT') {
                throw new BadRequestException('Can only mark SENT invoices as paid');
            }
            await invoice.update({ status: 'PAID', paidAt: new Date() }, { transaction: t });

            // Increment department revenue
            if (invoice.departmentId) {
                const year = new Date().getFullYear();
                let goal = await this.departmentGoalsService.findByDepartmentAndYear(invoice.departmentId, year);
                if (!goal) {
                    goal = await this.departmentGoalsService.create({
                        departmentId: invoice.departmentId,
                        year,
                        targetRevenue: 0,
                        currentRevenue: 0,
                    });
                }
                const newRevenue = Number(goal.currentRevenue) + Number(invoice.total);
                await this.departmentGoalsService.update(goal.id, { currentRevenue: newRevenue });
            }
        });

        return this.findOne(id);
    }

    async reject(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        // Idempotent: already rejected
        if (invoice.status === 'REJECTED') return invoice;
        if (invoice.status !== 'SENT') {
            throw new BadRequestException('Can only reject SENT invoices');
        }
        await invoice.update({ status: 'REJECTED' });
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const invoice = await this.findOne(id);
        if (invoice.status !== 'CREATED') {
            throw new BadRequestException('Can only delete invoices with CREATED status');
        }
        await this.sequelize.transaction(async (t) => {
            await this.invoiceItemModel.destroy({ where: { invoiceId: id }, transaction: t });
            await invoice.destroy({ transaction: t });
        });
    }

    async getRevenueByDepartment(from?: string, to?: string) {
        const where: any = { status: 'PAID' };
        if (from || to) {
            where.issueDate = {};
            if (from) where.issueDate[Op.gte] = new Date(from);
            if (to) where.issueDate[Op.lte] = new Date(to);
        }

        const invoices = await this.invoiceModel.findAll({
            where,
            include: [{ model: Department, attributes: ['id', 'name'] }],
        });

        const map = new Map<string, { name: string; revenue: number }>();
        for (const inv of invoices) {
            if (!inv.departmentId || !inv.department) continue;
            const entry = map.get(inv.departmentId) ?? { name: inv.department.name, revenue: 0 };
            entry.revenue += Number(inv.total);
            map.set(inv.departmentId, entry);
        }

        return Array.from(map.entries())
            .map(([id, { name, revenue }]) => ({ departmentId: id, department: name, revenue }))
            .sort((a, b) => b.revenue - a.revenue);
    }

    async getStats(departmentId?: string, from?: string, to?: string) {
        const where: any = {};
        if (departmentId) where.departmentId = departmentId;
        if (from || to) {
            where.issueDate = {};
            if (from) where.issueDate[Op.gte] = new Date(from);
            if (to) where.issueDate[Op.lte] = new Date(to);
        }

        const invoices = await this.invoiceModel.findAll({ where });

        const totalRevenue = invoices
            .filter(i => i.status === 'PAID')
            .reduce((sum, i) => sum + Number(i.total), 0);

        const totalPending = invoices
            .filter(i => i.status !== 'PAID' && i.status !== 'REJECTED')
            .reduce((sum, i) => sum + Number(i.total), 0);

        const countByStatus = {
            CREATED: invoices.filter(i => i.status === 'CREATED').length,
            SENT: invoices.filter(i => i.status === 'SENT').length,
            PAID: invoices.filter(i => i.status === 'PAID').length,
            REJECTED: invoices.filter(i => i.status === 'REJECTED').length,
        };

        const overdue = invoices.filter(
            i => i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < new Date(),
        ).length;

        return {
            total: invoices.length,
            totalRevenue,
            totalPending,
            overdue,
            countByStatus,
        };
    }
}

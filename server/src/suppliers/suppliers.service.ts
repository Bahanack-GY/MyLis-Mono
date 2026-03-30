import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Supplier } from '../models/supplier.model';
import { SupplierInvoice } from '../models/supplier-invoice.model';
import { SupplierInvoiceItem } from '../models/supplier-invoice-item.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { JournalEngineService } from '../accounting/journal-engine.service';

@Injectable()
export class SuppliersService {
    constructor(
        @InjectModel(Supplier) private supplierModel: typeof Supplier,
        @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
        @InjectModel(SupplierInvoiceItem) private itemModel: typeof SupplierInvoiceItem,
        @InjectConnection() private sequelize: Sequelize,
        private journalEngine: JournalEngineService,
    ) {}

    /* ─── Suppliers CRUD ─────────────────────────────────────────── */

    async findAllSuppliers() {
        return this.supplierModel.findAll({ order: [['name', 'ASC']] });
    }

    async findSupplier(id: string) {
        const s = await this.supplierModel.findByPk(id);
        if (!s) throw new NotFoundException('Fournisseur introuvable');
        return s;
    }

    async createSupplier(dto: any) {
        return this.supplierModel.create(dto);
    }

    async updateSupplier(id: string, dto: any) {
        const s = await this.findSupplier(id);
        return s.update(dto);
    }

    async deleteSupplier(id: string) {
        const s = await this.findSupplier(id);
        const invoiceCount = await this.invoiceModel.count({ where: { supplierId: id } });
        if (invoiceCount > 0) throw new BadRequestException('Ce fournisseur a des factures associées');
        await s.destroy();
        return { deleted: true };
    }

    /* ─── Supplier Invoices ──────────────────────────────────────── */

    private invoiceIncludes() {
        return [
            { model: Supplier, attributes: ['id', 'name', 'email', 'phone'] },
            { model: Department, attributes: ['id', 'name'], required: false },
            { model: User, as: 'createdBy', attributes: ['id', 'email'], required: false },
            { model: SupplierInvoiceItem },
        ];
    }

    async findAllInvoices(supplierId?: string, status?: string, departmentId?: string) {
        const where: any = {};
        if (supplierId) where.supplierId = supplierId;
        if (status) where.status = status;
        if (departmentId) where.departmentId = departmentId;
        return this.invoiceModel.findAll({
            where,
            include: this.invoiceIncludes(),
            order: [['date', 'DESC']],
        });
    }

    async findInvoice(id: string) {
        const inv = await this.invoiceModel.findByPk(id, { include: this.invoiceIncludes() });
        if (!inv) throw new NotFoundException('Facture introuvable');
        return inv;
    }

    async createInvoice(dto: any, userId: string) {
        const { items = [], ...invoiceData } = dto;

        return this.sequelize.transaction(async (t) => {
            // Auto-generate invoice number if not provided
            if (!invoiceData.invoiceNumber) {
                const count = await this.invoiceModel.count({ transaction: t });
                invoiceData.invoiceNumber = `FINV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
            }

            const computedItems = items.map((item: any) => {
                const qty = Number(item.quantity) || 1;
                const up = Number(item.unitPrice) || 0;
                const rate = Number(item.taxRate) || 0;
                const totalHT = Math.round(qty * up * 100) / 100;
                const totalTTC = Math.round(totalHT * (1 + rate / 100) * 100) / 100;
                return { ...item, quantity: qty, unitPrice: up, taxRate: rate, totalHT, totalTTC };
            });

            const totalHT = computedItems.reduce((s: number, i: any) => s + i.totalHT, 0);
            const totalTTC = computedItems.reduce((s: number, i: any) => s + i.totalTTC, 0);
            const taxAmount = Math.round((totalTTC - totalHT) * 100) / 100;

            const invoice = await this.invoiceModel.create({
                ...invoiceData,
                createdByUserId: userId,
                totalHT: Math.round(totalHT * 100) / 100,
                totalTTC: Math.round(totalTTC * 100) / 100,
                taxAmount,
                status: 'DRAFT',
            } as any, { transaction: t });

            if (computedItems.length > 0) {
                await this.itemModel.bulkCreate(
                    computedItems.map((i: any) => ({ ...i, supplierInvoiceId: invoice.id })),
                    { transaction: t },
                );
            }

            return this.findInvoice(invoice.id);
        });
    }

    async updateInvoice(id: string, dto: any, userId: string) {
        const invoice = await this.findInvoice(id);
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Seules les factures brouillon peuvent être modifiées');

        const { items, ...invoiceData } = dto;

        return this.sequelize.transaction(async (t) => {
            if (items !== undefined) {
                await this.itemModel.destroy({ where: { supplierInvoiceId: id }, transaction: t });

                const computedItems = items.map((item: any) => {
                    const qty = Number(item.quantity) || 1;
                    const up = Number(item.unitPrice) || 0;
                    const rate = Number(item.taxRate) || 0;
                    const totalHT = Math.round(qty * up * 100) / 100;
                    const totalTTC = Math.round(totalHT * (1 + rate / 100) * 100) / 100;
                    return { ...item, quantity: qty, unitPrice: up, taxRate: rate, totalHT, totalTTC, supplierInvoiceId: id };
                });

                const totalHT = computedItems.reduce((s: number, i: any) => s + i.totalHT, 0);
                const totalTTC = computedItems.reduce((s: number, i: any) => s + i.totalTTC, 0);
                const taxAmount = Math.round((totalTTC - totalHT) * 100) / 100;

                await this.itemModel.bulkCreate(computedItems, { transaction: t });

                invoiceData.totalHT = Math.round(totalHT * 100) / 100;
                invoiceData.totalTTC = Math.round(totalTTC * 100) / 100;
                invoiceData.taxAmount = taxAmount;
            }

            await invoice.update(invoiceData, { transaction: t });
            return this.findInvoice(id);
        });
    }

    async validateInvoice(id: string, userId: string) {
        const invoice = await this.findInvoice(id);
        if (invoice.status !== 'DRAFT') throw new BadRequestException('Seules les factures brouillon peuvent être validées');

        await invoice.update({ status: 'VALIDATED' });

        // Journal entry: Debit 601000 (Achats) / Credit 401000 (Fournisseurs)
        const supplierName = invoice.supplier?.name || 'Fournisseur';
        await this.journalEngine.onSupplierInvoiceValidated({
            invoiceId: id,
            supplierName,
            invoiceNumber: invoice.invoiceNumber,
            totalHT: Number(invoice.totalHT),
            taxAmount: Number(invoice.taxAmount),
            totalTTC: Number(invoice.totalTTC),
            date: invoice.date,
            userId,
        });

        return this.findInvoice(id);
    }

    async payInvoice(id: string, paidAt: string, userId: string) {
        const invoice = await this.findInvoice(id);
        if (invoice.status !== 'VALIDATED') throw new BadRequestException('Seules les factures validées peuvent être payées');

        await invoice.update({ status: 'PAID', paidAt });

        // Journal entry: Debit 401000 (Fournisseurs) / Credit 521000 (Banque)
        const supplierName = invoice.supplier?.name || 'Fournisseur';
        await this.journalEngine.onSupplierInvoicePaid({
            invoiceId: id,
            supplierName,
            invoiceNumber: invoice.invoiceNumber,
            totalTTC: Number(invoice.totalTTC),
            date: paidAt,
            userId,
        });

        return this.findInvoice(id);
    }

    async cancelInvoice(id: string) {
        const invoice = await this.findInvoice(id);
        if (invoice.status === 'PAID') throw new BadRequestException('Une facture payée ne peut pas être annulée');
        await invoice.update({ status: 'CANCELLED' });
        return this.findInvoice(id);
    }

    async getStats(departmentId?: string) {
        const where: any = { status: { [Op.ne]: 'CANCELLED' } };
        if (departmentId) where.departmentId = departmentId;

        const invoices = await this.invoiceModel.findAll({ where });

        const totalDraft = invoices.filter(i => i.status === 'DRAFT').reduce((s, i) => s + Number(i.totalTTC), 0);
        const totalValidated = invoices.filter(i => i.status === 'VALIDATED').reduce((s, i) => s + Number(i.totalTTC), 0);
        const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.totalTTC), 0);

        const today = new Date().toISOString().split('T')[0];
        const overdue = invoices.filter(i => i.status === 'VALIDATED' && i.dueDate < today);
        const totalOverdue = overdue.reduce((s, i) => s + Number(i.totalTTC), 0);

        return {
            totalDraft: Math.round(totalDraft),
            totalValidated: Math.round(totalValidated),
            totalPaid: Math.round(totalPaid),
            totalOverdue: Math.round(totalOverdue),
            countDraft: invoices.filter(i => i.status === 'DRAFT').length,
            countValidated: invoices.filter(i => i.status === 'VALIDATED').length,
            countPaid: invoices.filter(i => i.status === 'PAID').length,
            countOverdue: overdue.length,
        };
    }
}

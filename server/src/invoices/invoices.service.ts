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
import { JournalEngineService } from '../accounting/journal-engine.service';
import { Op, QueryTypes } from 'sequelize';
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
        private journalEngine: JournalEngineService,
    ) { }

    private async generateInvoiceNumber(): Promise<string> {
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
                ? parseInt(lastInvoice.invoiceNumber!.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(4, '0')}`;
        });
    }

    private async generateProformaNumber(): Promise<string> {
        return this.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' as any }, async (t) => {
            const year = new Date().getFullYear();
            const prefix = `PRO-${year}-`;
            const last = await this.invoiceModel.findOne({
                where: { proformaNumber: { [Op.like]: `${prefix}%` } },
                order: [['proformaNumber', 'DESC']],
                lock: true,
                transaction: t,
            });
            const nextNum = last
                ? parseInt(last.proformaNumber!.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(4, '0')}`;
        });
    }

    async create(dto: any, userId: string): Promise<Invoice> {
        const isProforma = dto.type === 'PROFORMA';
        const invoiceNumber = isProforma ? null : await this.generateInvoiceNumber();
        const proformaNumber = isProforma ? await this.generateProformaNumber() : null;

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
                proformaNumber,
                type: isProforma ? 'PROFORMA' : 'INVOICE',
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
            include: [
                Project, Department, Client,
                { model: User, as: 'createdBy' },
                InvoiceItem,
                { model: Invoice, as: 'parentInvoice', attributes: ['id', 'invoiceNumber', 'total'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceModel.findByPk(id, {
            include: [
                Project, Department, Client,
                { model: User, as: 'createdBy' },
                InvoiceItem,
                { model: Invoice, as: 'parentInvoice', attributes: ['id', 'invoiceNumber', 'total'] },
            ],
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    private async generateAcompteNumber(): Promise<string> {
        return this.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' as any }, async (t) => {
            const year = new Date().getFullYear();
            const prefix = `ACP-${year}-`;
            const last = await this.invoiceModel.findOne({
                where: { acompteNumber: { [Op.like]: `${prefix}%` } },
                order: [['acompteNumber', 'DESC']],
                lock: true,
                transaction: t,
            });
            const nextNum = last
                ? parseInt(last.acompteNumber!.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(4, '0')}`;
        });
    }

    async createAcompte(parentId: string, amount: number): Promise<Invoice> {
        const parent = await this.findOne(parentId);
        if (parent.type !== 'INVOICE' || parent.status !== 'SENT') {
            throw new BadRequestException('Les acomptes ne peuvent être créés que sur une facture envoyée');
        }
        if (amount <= 0 || amount > Number(parent.total)) {
            throw new BadRequestException('Montant invalide');
        }
        const acompteNumber = await this.generateAcompteNumber();
        const acompte = await this.sequelize.transaction(async (t) => {
            const inv = await this.invoiceModel.create({
                acompteNumber,
                type: 'ACOMPTE',
                status: 'PAID',
                parentInvoiceId: parentId,
                projectId: parent.projectId,
                departmentId: parent.departmentId,
                clientId: parent.clientId,
                createdById: parent.createdById,
                issueDate: new Date(),
                dueDate: parent.dueDate,
                subtotal: amount,
                taxRate: 0,
                taxAmount: 0,
                total: amount,
                acompteAmount: amount,
                notes: `Acompte sur facture ${parent.invoiceNumber}`,
            }, { transaction: t });

            await this.invoiceItemModel.create({
                invoiceId: inv.id,
                description: `Acompte sur facture ${parent.invoiceNumber}`,
                quantity: 1,
                unitPrice: amount,
                amount,
            }, { transaction: t });

            return inv;
        });

        // Journal entry: bank receives acompte, client account reduced
        const acompteRecord = await this.findOne(acompte.id);
        await this.journalEngine.onAcompteCreated(acompteRecord, parent, parent.createdById || '');

        // Record acompte revenue immediately
        if (parent.departmentId) {
            const year = new Date().getFullYear();
            let goal = await this.departmentGoalsService.findByDepartmentAndYear(parent.departmentId, year);
            if (!goal) {
                goal = await this.departmentGoalsService.create({
                    departmentId: parent.departmentId,
                    year,
                    targetRevenue: 0,
                    currentRevenue: 0,
                });
            }
            await this.departmentGoalsService.update(goal.id, {
                currentRevenue: Number(goal.currentRevenue) + Number(amount),
            });
        }

        return this.findOne(acompte.id);
    }

    async validateProforma(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        if (invoice.type !== 'PROFORMA') {
            throw new BadRequestException('Only proformas can be validated');
        }
        const invoiceNumber = await this.generateInvoiceNumber();
        await invoice.update({ type: 'INVOICE', invoiceNumber, status: 'CREATED' });
        return this.findOne(id);
    }

    async update(id: string, dto: any, userId?: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        if (invoice.type === 'INVOICE' && invoice.status !== 'CREATED') {
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
        } else {
            await invoice.update(dto);
        }

        const updated = await this.findOne(id);

        // Acomptes already have a journal entry — sync it when amounts change
        if (invoice.type === 'ACOMPTE' && userId) {
            const parentInvoice = invoice.parentInvoiceId
                ? await this.findOne(invoice.parentInvoiceId)
                : null;
            await this.journalEngine.onAcompteUpdated(updated, parentInvoice, userId);
        }

        return updated;
    }

    async send(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        if (invoice.type === 'PROFORMA') {
            throw new BadRequestException('Cannot send a proforma — validate it first');
        }
        // Idempotent: already sent
        if (invoice.status === 'SENT') return invoice;
        if (invoice.status !== 'CREATED') {
            throw new BadRequestException('Can only send invoices with CREATED status');
        }
        await invoice.update({ status: 'SENT', sentAt: new Date() });
        const updated = await this.findOne(id);

        // Auto-generate journal entry for invoice sent
        await this.journalEngine.onInvoiceSent(updated, updated.createdById || '');

        return updated;
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

            // Increment department revenue only by the remaining amount (after acomptes)
            if (invoice.departmentId) {
                const acomptes = await this.invoiceModel.findAll({
                    where: { parentInvoiceId: id, type: 'ACOMPTE', status: 'PAID' },
                    transaction: t,
                });
                const acompteTotal = acomptes.reduce((sum, a) => sum + Number(a.total), 0);
                const revenueToAdd = Math.max(0, Number(invoice.total) - acompteTotal);

                if (revenueToAdd > 0) {
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
                    await this.departmentGoalsService.update(goal.id, {
                        currentRevenue: Number(goal.currentRevenue) + revenueToAdd,
                    });
                }
            }
        });

        const paid = await this.findOne(id);

        // Compute remaining amount after any acomptes already journalised
        const acomptes = await this.invoiceModel.findAll({
            where: { parentInvoiceId: id, type: 'ACOMPTE', status: 'PAID' },
        });
        const acompteTotal = acomptes.reduce((sum, a) => sum + Number(a.total), 0);
        const remainingAmount = Math.max(0, Number(paid.total) - acompteTotal);

        // Only create payment entry for the amount not yet collected via acomptes
        if (remainingAmount > 0) {
            await this.journalEngine.onInvoicePaid(paid, paid.createdById || '', remainingAmount);
        }

        return paid;
    }

    async reject(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        // Idempotent: already rejected
        if (invoice.status === 'REJECTED') return invoice;
        if (invoice.status !== 'SENT') {
            throw new BadRequestException('Can only reject SENT invoices');
        }
        await invoice.update({ status: 'REJECTED' });
        const updated = await this.findOne(id);
        await this.journalEngine.onInvoiceRejected(updated, (updated as any).createdById || '');
        return updated;
    }

    async remove(id: string): Promise<void> {
        const invoice = await this.findOne(id);
        if (invoice.type === 'INVOICE' && invoice.status !== 'CREATED') {
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

        // Pre-compute acompte totals per parent invoice to avoid double-counting
        const acomptesByParent: Record<string, number> = {};
        for (const inv of invoices) {
            if (inv.type === 'ACOMPTE' && inv.parentInvoiceId) {
                acomptesByParent[inv.parentInvoiceId] = (acomptesByParent[inv.parentInvoiceId] || 0) + Number(inv.total);
            }
        }

        const map = new Map<string, { name: string; revenue: number }>();
        for (const inv of invoices) {
            if (!inv.departmentId || !inv.department) continue;
            let contribution = 0;
            if (inv.type === 'ACOMPTE') {
                contribution = Number(inv.total);
            } else if (inv.type === 'INVOICE') {
                contribution = Math.max(0, Number(inv.total) - (acomptesByParent[inv.id] || 0));
            }
            if (contribution <= 0) continue;
            const entry = map.get(inv.departmentId) ?? { name: inv.department.name, revenue: 0 };
            entry.revenue += contribution;
            map.set(inv.departmentId, entry);
        }

        // Merge carwash journal-entry revenue (sourceType = CARWASH_REVENUE, credit on class-7 accounts)
        try {
            const dateConditions = [
                from ? `AND je.date >= :from` : '',
                to   ? `AND je.date <= :to`   : '',
            ].join(' ');
            const carwashRows: Array<{ departmentId: string; deptName: string; revenue: string }> =
                await (this.sequelize as any).query(`
                    SELECT jel."departmentId", d.name AS "deptName", SUM(jel.credit) AS revenue
                    FROM journal_entry_lines jel
                    JOIN journal_entries je ON je.id = jel."journalEntryId"
                    JOIN "Departments" d ON d.id = jel."departmentId"
                    JOIN accounts a ON a.id = jel."accountId"
                    WHERE je."sourceType" = 'CARWASH_REVENUE'
                      AND a.code LIKE '7%'
                      AND jel.credit > 0
                      ${dateConditions}
                    GROUP BY jel."departmentId", d.name
                `, { replacements: { from, to }, type: QueryTypes.SELECT });

            for (const row of carwashRows) {
                const existing = map.get(row.departmentId);
                if (existing) {
                    existing.revenue += Number(row.revenue) || 0;
                } else {
                    map.set(row.departmentId, { name: row.deptName, revenue: Number(row.revenue) || 0 });
                }
            }
        } catch (err: any) {
            // Non-fatal: log and continue so regular invoice data still returns
            console.warn('[getRevenueByDepartment] carwash journal query failed:', err?.message);
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

        const allRecords = await this.invoiceModel.findAll({ where });

        const paidAcomptes = allRecords.filter(i => i.type === 'ACOMPTE' && i.status === 'PAID');
        const acomptesByParent: Record<string, number> = {};
        for (const a of paidAcomptes) {
            if (a.parentInvoiceId) {
                acomptesByParent[a.parentInvoiceId] = (acomptesByParent[a.parentInvoiceId] || 0) + Number(a.total);
            }
        }

        // Only INVOICE-type records for counts and pending (not proformas, not acomptes)
        const invoicesOnly = allRecords.filter(i => i.type === 'INVOICE');

        // Revenue = paid acomptes + paid invoices minus their already-counted acomptes
        const totalRevenue =
            paidAcomptes.reduce((sum, a) => sum + Number(a.total), 0) +
            invoicesOnly
                .filter(i => i.status === 'PAID')
                .reduce((sum, i) => sum + Math.max(0, Number(i.total) - (acomptesByParent[i.id] || 0)), 0);

        // Pending = sent/created invoices minus their already-paid acomptes
        const totalPending = invoicesOnly
            .filter(i => i.status !== 'PAID' && i.status !== 'REJECTED')
            .reduce((sum, i) => sum + Math.max(0, Number(i.total) - (acomptesByParent[i.id] || 0)), 0);

        const countByStatus = {
            CREATED: invoicesOnly.filter(i => i.status === 'CREATED').length,
            SENT: invoicesOnly.filter(i => i.status === 'SENT').length,
            PAID: invoicesOnly.filter(i => i.status === 'PAID').length,
            REJECTED: invoicesOnly.filter(i => i.status === 'REJECTED').length,
        };

        const overdue = invoicesOnly.filter(
            i => i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < new Date(),
        ).length;

        return {
            total: invoicesOnly.length,
            totalRevenue,
            totalPending,
            overdue,
            countByStatus,
        };
    }
}

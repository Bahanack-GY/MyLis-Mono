import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { ClientPayment } from '../models/client-payment.model';
import { Invoice } from '../models/invoice.model';
import { InvoiceItem } from '../models/invoice-item.model';
import { Client } from '../models/client.model';
import { User } from '../models/user.model';

@Injectable()
export class ClientPaymentsService {
    constructor(
        @InjectModel(ClientPayment)
        private paymentModel: typeof ClientPayment,
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectModel(Client)
        private clientModel: typeof Client,
    ) { }

    async create(dto: any): Promise<ClientPayment> {
        const payment = await this.paymentModel.create(dto);
        return this.findOne(payment.id);
    }

    async findAll(filters: {
        page?: number;
        limit?: number;
        clientId?: string;
        invoiceId?: string;
        dateFrom?: string;
        dateTo?: string;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = {};

        if (filters.clientId) where.clientId = filters.clientId;
        if (filters.invoiceId) where.invoiceId = filters.invoiceId;
        if (filters.dateFrom || filters.dateTo) {
            where.date = {};
            if (filters.dateFrom) where.date[Op.gte] = filters.dateFrom;
            if (filters.dateTo) where.date[Op.lte] = filters.dateTo;
        }

        const { count, rows } = await this.paymentModel.findAndCountAll({
            where,
            include: [
                { model: Invoice, attributes: ['id', 'invoiceNumber', 'total', 'status'] },
                { model: Client, attributes: ['id', 'name'] },
            ],
            order: [['date', 'DESC']],
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

    async findOne(id: string): Promise<ClientPayment> {
        const payment = await this.paymentModel.findByPk(id, {
            include: [
                { model: Invoice, attributes: ['id', 'invoiceNumber', 'total', 'status'] },
                { model: Client, attributes: ['id', 'name'] },
            ],
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async update(id: string, dto: any): Promise<ClientPayment> {
        const payment = await this.findOne(id);
        await payment.update(dto);
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ success: boolean }> {
        const payment = await this.findOne(id);
        await payment.destroy();
        return { success: true };
    }

    async getClientStatement(clientId: string) {
        const client = await this.clientModel.findByPk(clientId);
        if (!client) throw new NotFoundException('Client not found');

        const invoices = await this.invoiceModel.findAll({
            where: { clientId },
            include: [{ model: InvoiceItem }],
            order: [['issueDate', 'ASC']],
        });

        const payments = await this.paymentModel.findAll({
            where: { clientId },
            order: [['date', 'ASC']],
        });

        // Build ledger rows
        const rows: any[] = [];
        let runningBalance = 0;

        for (const invoice of invoices) {
            // Get items description
            const items = (invoice as any).items || [];
            const itemDescriptions = items.map((it: any) => it.description).join(', ');
            const totalQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
            const invoiceTotal = Number(invoice.total) || 0;

            // Get payments for this invoice
            const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
            const totalPaid = invoicePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            runningBalance += invoiceTotal;

            // Invoice row
            rows.push({
                type: 'invoice',
                dateFacture: invoice.issueDate,
                numeroFacture: invoice.invoiceNumber,
                datePaiement: null,
                refPaiement: null,
                produitsServices: itemDescriptions,
                quantite: totalQty,
                montantFacture: invoiceTotal,
                montantPaiement: 0,
                solde: runningBalance,
            });

            // Payment rows for this invoice
            for (const payment of invoicePayments) {
                const paidAmount = Number(payment.amount) || 0;
                runningBalance -= paidAmount;

                rows.push({
                    type: 'payment',
                    dateFacture: invoice.issueDate,
                    numeroFacture: invoice.invoiceNumber,
                    datePaiement: payment.date,
                    refPaiement: payment.reference,
                    produitsServices: null,
                    quantite: null,
                    montantFacture: 0,
                    montantPaiement: paidAmount,
                    solde: runningBalance,
                });
            }
        }

        const totalFactures = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        const totalPaiements = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        return {
            client: {
                id: client.id,
                name: client.name,
            },
            rows,
            totals: {
                factures: totalFactures,
                paiements: totalPaiements,
                solde: totalFactures - totalPaiements,
            },
        };
    }

    async getSalesSummary() {
        const clients = await this.clientModel.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']],
        });

        const summary: any[] = [];
        let grandTotalFactures = 0;
        let grandTotalPaiements = 0;

        for (const client of clients) {
            const invoiceTotal = await this.invoiceModel.sum('total', {
                where: { clientId: client.id },
            }) || 0;

            const paymentTotal = await this.paymentModel.sum('amount', {
                where: { clientId: client.id },
            }) || 0;

            summary.push({
                clientId: client.id,
                clientName: client.name,
                factures: Number(invoiceTotal),
                paiements: Number(paymentTotal),
                solde: Number(invoiceTotal) - Number(paymentTotal),
            });

            grandTotalFactures += Number(invoiceTotal);
            grandTotalPaiements += Number(paymentTotal);
        }

        return {
            clients: summary,
            totals: {
                factures: grandTotalFactures,
                paiements: grandTotalPaiements,
                solde: grandTotalFactures - grandTotalPaiements,
            },
        };
    }
}

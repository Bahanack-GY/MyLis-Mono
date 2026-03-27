import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';
import { Invoice } from '../models/invoice.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { JournalEntry } from '../models/journal-entry.model';
import { Account } from '../models/account.model';

@Injectable()
export class TvaService {
    constructor(
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectConnection()
        private sequelize: Sequelize,
    ) {}

    /**
     * Calculate TVA for a given month
     * TVA collected (from sales) - TVA deductible (from purchases) = TVA due
     */
    async calculateMonthly(month: number, year: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

        // TVA collected from invoices sent/paid in this period
        const invoices = await this.invoiceModel.findAll({
            where: {
                status: { [Op.in]: ['SENT', 'PAID'] },
                sentAt: { [Op.between]: [startDate, endDate + ' 23:59:59'] },
            },
        });

        const tvaCollected = invoices.reduce((sum, inv) => sum + (Number(inv.taxAmount) || 0), 0);
        const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);

        // TVA déductible: sum of debit movements on account 443200 in the period
        // (recorded automatically by the journal engine when purchase-side expenses create TVA entries)
        const [deductibleRows] = await this.sequelize.query(`
            SELECT COALESCE(SUM(jel.debit), 0) AS total
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            JOIN accounts a ON a.id = jel."accountId"
            WHERE a.code = '443200'
              AND je.status = 'VALIDATED'
              AND je.date >= :startDate
              AND je.date <= :endDate
        `, { replacements: { startDate, endDate } });
        const tvaDeductible = Math.round((Number((deductibleRows as any[])[0]?.total) || 0) * 100) / 100;

        const tvaDue = tvaCollected - tvaDeductible;

        return {
            period: `${year}-${String(month).padStart(2, '0')}`,
            totalSales: Math.round(totalSales * 100) / 100,
            tvaCollected: Math.round(tvaCollected * 100) / 100,
            tvaDeductible: Math.round(tvaDeductible * 100) / 100,
            tvaDue: Math.round(tvaDue * 100) / 100,
            invoiceCount: invoices.length,
            dueDate: `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-15`,
        };
    }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { Account } from '../models/account.model';
import { AccountCategory } from '../models/account-category.model';

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(JournalEntryLine)
        private lineModel: typeof JournalEntryLine,
        @InjectModel(JournalEntry)
        private entryModel: typeof JournalEntry,
        @InjectModel(Account)
        private accountModel: typeof Account,
        @InjectModel(AccountCategory)
        private categoryModel: typeof AccountCategory,
        @InjectConnection()
        private sequelize: Sequelize,
    ) {}

    /**
     * Grand Livre — All validated entries grouped by account with running balance
     */
    async grandLivre(fiscalYearId: string, accountId?: string) {
        const where: any = {};
        if (accountId) where.accountId = accountId;

        const lines = await this.lineModel.findAll({
            where,
            include: [
                {
                    model: JournalEntry,
                    where: { fiscalYearId, status: 'VALIDATED' },
                    attributes: ['id', 'entryNumber', 'date', 'description', 'reference', 'sourceType', 'sourceId'],
                },
                {
                    model: Account,
                    attributes: ['id', 'code', 'name', 'type'],
                },
            ],
            order: [[{ model: Account, as: 'account' }, 'code', 'ASC'], [{ model: JournalEntry, as: 'journalEntry' }, 'date', 'ASC']],
        });

        // Group by account
        const accountMap = new Map<string, { account: any; lines: any[]; totalDebit: number; totalCredit: number; balance: number }>();

        for (const line of lines) {
            const plain = line.get({ plain: true }) as any;
            const accountCode = plain.account.code;

            if (!accountMap.has(accountCode)) {
                accountMap.set(accountCode, {
                    account: plain.account,
                    lines: [],
                    totalDebit: 0,
                    totalCredit: 0,
                    balance: 0,
                });
            }

            const entry = accountMap.get(accountCode)!;
            entry.totalDebit += Number(plain.debit) || 0;
            entry.totalCredit += Number(plain.credit) || 0;
            entry.balance = entry.totalDebit - entry.totalCredit;
            entry.lines.push({
                date: plain.journalEntry.date,
                entryNumber: plain.journalEntry.entryNumber,
                description: plain.journalEntry.description,
                reference: plain.journalEntry.reference,
                sourceType: plain.journalEntry.sourceType,
                sourceId: plain.journalEntry.sourceId,
                debit: Number(plain.debit) || 0,
                credit: Number(plain.credit) || 0,
                runningBalance: entry.balance,
                label: plain.label,
            });
        }

        return Array.from(accountMap.values()).sort((a, b) => a.account.code.localeCompare(b.account.code));
    }

    /**
     * Balance des comptes — Summary of each account's total debit, credit, and balance
     */
    async trialBalance(fiscalYearId: string) {
        const results = await this.lineModel.findAll({
            attributes: [
                'accountId',
                [this.sequelize.fn('SUM', this.sequelize.col('JournalEntryLine.debit')), 'totalDebit'],
                [this.sequelize.fn('SUM', this.sequelize.col('JournalEntryLine.credit')), 'totalCredit'],
            ],
            include: [
                {
                    model: JournalEntry,
                    where: { fiscalYearId, status: 'VALIDATED' },
                    attributes: [],
                },
                {
                    model: Account,
                    attributes: ['id', 'code', 'name', 'type'],
                    include: [{ model: AccountCategory, attributes: ['id', 'code', 'name'] }],
                },
            ],
            group: ['accountId', 'account.id', 'account.code', 'account.name', 'account.type', 'account.category.id', 'account.category.code', 'account.category.name'],
            order: [[{ model: Account, as: 'account' }, 'code', 'ASC']],
            raw: false,
        });

        let grandTotalDebit = 0;
        let grandTotalCredit = 0;

        const accounts = results.map((r: any) => {
            const plain = r.get({ plain: true });
            const totalDebit = Number(plain.totalDebit) || 0;
            const totalCredit = Number(plain.totalCredit) || 0;
            const balance = totalDebit - totalCredit;
            grandTotalDebit += totalDebit;
            grandTotalCredit += totalCredit;

            return {
                account: plain.account,
                totalDebit,
                totalCredit,
                debitBalance: balance > 0 ? balance : 0,
                creditBalance: balance < 0 ? Math.abs(balance) : 0,
            };
        });

        return {
            accounts,
            totals: {
                totalDebit: grandTotalDebit,
                totalCredit: grandTotalCredit,
                isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
            },
        };
    }

    /**
     * Bilan (Balance Sheet) — OHADA format
     * Assets (classes 2,3,4-debit,5) vs Liabilities (classes 1,4-credit)
     */
    async balanceSheet(fiscalYearId: string) {
        const trial = await this.trialBalance(fiscalYearId);

        const assets: any[] = [];
        const liabilities: any[] = [];
        let totalAssets = 0;
        let totalLiabilities = 0;

        for (const item of trial.accounts) {
            const classCode = item.account.code.charAt(0);
            const balance = item.debitBalance - item.creditBalance;

            if (['2', '3', '5'].includes(classCode)) {
                // Fixed assets, inventory, treasury — always assets
                const amount = item.debitBalance || 0;
                if (amount !== 0) {
                    assets.push({ ...item, amount });
                    totalAssets += amount;
                }
            } else if (classCode === '1') {
                // Equity and long-term liabilities
                const amount = item.creditBalance || 0;
                if (amount !== 0) {
                    liabilities.push({ ...item, amount });
                    totalLiabilities += amount;
                }
            } else if (classCode === '4') {
                // Third-party: debit balances are assets, credit balances are liabilities
                if (item.debitBalance > 0) {
                    assets.push({ ...item, amount: item.debitBalance });
                    totalAssets += item.debitBalance;
                }
                if (item.creditBalance > 0) {
                    liabilities.push({ ...item, amount: item.creditBalance });
                    totalLiabilities += item.creditBalance;
                }
            }
        }

        // Add net income to equity (liabilities side)
        const incomeStatement = await this.incomeStatement(fiscalYearId);
        if (incomeStatement.netIncome !== 0) {
            liabilities.push({
                account: { code: '120000', name: incomeStatement.netIncome >= 0 ? 'Résultat de l\'exercice (bénéfice)' : 'Résultat de l\'exercice (perte)', type: 'EQUITY' },
                amount: incomeStatement.netIncome,
            });
            totalLiabilities += incomeStatement.netIncome;
        }

        return {
            assets,
            liabilities,
            totalAssets: Math.round(totalAssets * 100) / 100,
            totalLiabilities: Math.round(totalLiabilities * 100) / 100,
            isBalanced: Math.abs(totalAssets - totalLiabilities) < 0.01,
        };
    }

    /**
     * Compte de Résultat (Income Statement) — OHADA format
     * Revenue (class 7) minus Expenses (class 6) = Net Income
     */
    async incomeStatement(fiscalYearId: string) {
        const trial = await this.trialBalance(fiscalYearId);

        const revenues: any[] = [];
        const expenses: any[] = [];
        let totalRevenue = 0;
        let totalExpenses = 0;

        for (const item of trial.accounts) {
            const classCode = item.account.code.charAt(0);

            if (classCode === '7' || (classCode === '8' && item.account.type === 'REVENUE')) {
                const amount = item.creditBalance || 0;
                if (amount !== 0) {
                    revenues.push({ ...item, amount });
                    totalRevenue += amount;
                }
            } else if (classCode === '6' || (classCode === '8' && item.account.type === 'EXPENSE')) {
                const amount = item.debitBalance || 0;
                if (amount !== 0) {
                    expenses.push({ ...item, amount });
                    totalExpenses += amount;
                }
            }
        }

        return {
            revenues,
            expenses,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            netIncome: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        };
    }

    /**
     * Dashboard KPIs for the accountant
     */
    async dashboardKpis(fiscalYearId: string) {
        const incomeStmt = await this.incomeStatement(fiscalYearId);
        const trial = await this.trialBalance(fiscalYearId);

        // Cash balance (class 5 accounts)
        let cashBalance = 0;
        for (const item of trial.accounts) {
            if (item.account.code.startsWith('5')) {
                cashBalance += (item.debitBalance || 0) - (item.creditBalance || 0);
            }
        }

        // Receivables (411xxx accounts)
        let receivables = 0;
        for (const item of trial.accounts) {
            if (item.account.code.startsWith('411')) {
                receivables += item.debitBalance || 0;
            }
        }

        // Payables (401xxx accounts)
        let payables = 0;
        for (const item of trial.accounts) {
            if (item.account.code.startsWith('401')) {
                payables += item.creditBalance || 0;
            }
        }

        // TVA due
        let tvaCollected = 0;
        let tvaDeductible = 0;
        for (const item of trial.accounts) {
            if (item.account.code === '443100') tvaCollected = item.creditBalance || 0;
            if (item.account.code === '443200') tvaDeductible = item.debitBalance || 0;
        }

        return {
            totalRevenue: incomeStmt.totalRevenue,
            totalExpenses: incomeStmt.totalExpenses,
            netIncome: incomeStmt.netIncome,
            cashBalance: Math.round(cashBalance * 100) / 100,
            receivables: Math.round(receivables * 100) / 100,
            payables: Math.round(payables * 100) / 100,
            tvaDue: Math.round((tvaCollected - tvaDeductible) * 100) / 100,
        };
    }

    /**
     * Monthly revenue vs expenses breakdown for the bar chart.
     * Queries journal entry lines grouped by month, with revenue (class 7)
     * and expenses (class 6) separated.
     */
    async monthlySummary(fiscalYearId: string) {
        const [rows] = await this.sequelize.query(`
            SELECT
                EXTRACT(MONTH FROM je."date")::int AS month,
                COALESCE(SUM(CASE WHEN a."code" LIKE '7%' THEN jel."credit" ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN a."code" LIKE '6%' THEN jel."debit" ELSE 0 END), 0) AS expenses
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            JOIN accounts a ON a.id = jel."accountId"
            WHERE je."fiscalYearId" = :fiscalYearId
              AND je.status = 'VALIDATED'
            GROUP BY EXTRACT(MONTH FROM je."date")
            ORDER BY month
        `, {
            replacements: { fiscalYearId },
        });

        // Build a full 12-month array
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            revenue: 0,
            expenses: 0,
        }));

        for (const row of rows as any[]) {
            const idx = Number(row.month) - 1;
            if (idx >= 0 && idx < 12) {
                months[idx].revenue = Math.round(Number(row.revenue) || 0);
                months[idx].expenses = Math.round(Number(row.expenses) || 0);
            }
        }

        return months;
    }
}

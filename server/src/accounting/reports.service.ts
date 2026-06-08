import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { Account } from '../models/account.model';
import { AccountCategory } from '../models/account-category.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys';

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
        @InjectModel(FiscalYear)
        private fiscalYearModel: typeof FiscalYear,
        @InjectConnection()
        private sequelize: Sequelize,
        private cache: CacheService,
    ) {}

    /**
     * Grand Livre — All validated entries grouped by account with running balance
     */
    async grandLivre(fiscalYearId: string, accountId?: string, departmentId?: string) {
        const key = CACHE_KEYS.GRAND_LIVRE(fiscalYearId, accountId, departmentId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

        const where: any = {};
        if (accountId) where.accountId = accountId;
        if (departmentId) where.departmentId = departmentId;

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
                    as: 'account',
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

        const result = Array.from(accountMap.values()).sort((a, b) => a.account.code.localeCompare(b.account.code));
        await this.cache.set(key, result, CACHE_TTL.REPORTS);
        return result;
    }

    /**
     * Balance des comptes — Summary of each account's total debit, credit, and balance
     */
    async trialBalance(fiscalYearId: string, departmentId?: string) {
        const key = CACHE_KEYS.TRIAL_BALANCE(fiscalYearId, departmentId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

        const lineWhere: any = {};
        if (departmentId) lineWhere.departmentId = departmentId;

        const results = await this.lineModel.findAll({
            where: Object.keys(lineWhere).length ? lineWhere : undefined,
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
                    as: 'account',
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

        const result = {
            accounts,
            totals: {
                totalDebit: grandTotalDebit,
                totalCredit: grandTotalCredit,
                isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
            },
        };
        await this.cache.set(key, result, CACHE_TTL.REPORTS);
        return result;
    }

    /**
     * Bilan (Balance Sheet) — OHADA format
     * Assets (classes 2,3,4-debit,5) vs Liabilities (classes 1,4-credit)
     */
    async balanceSheet(fiscalYearId: string) {
        const key = CACHE_KEYS.BALANCE_SHEET(fiscalYearId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

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

        const result = {
            assets,
            liabilities,
            totalAssets: Math.round(totalAssets * 100) / 100,
            totalLiabilities: Math.round(totalLiabilities * 100) / 100,
            isBalanced: Math.abs(totalAssets - totalLiabilities) < 0.01,
        };
        await this.cache.set(key, result, CACHE_TTL.REPORTS);
        return result;
    }

    /**
     * Compte de Résultat (Income Statement) — OHADA format
     * Revenue (class 7) minus Expenses (class 6) = Net Income
     */
    async incomeStatement(fiscalYearId: string, departmentId?: string) {
        const key = CACHE_KEYS.INCOME_STATEMENT(fiscalYearId, departmentId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

        const trial = await this.trialBalance(fiscalYearId, departmentId);

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

        const result = {
            revenues,
            expenses,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            netIncome: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        };
        await this.cache.set(key, result, CACHE_TTL.REPORTS);
        return result;
    }

    /**
     * Dashboard KPIs for the accountant
     */
    async dashboardKpis(fiscalYearId: string, departmentId?: string) {
        const key = CACHE_KEYS.DASHBOARD_KPIS(fiscalYearId, departmentId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

        // When filtering by department, income statement uses department-scoped trial balance
        const incomeStmt = await this.incomeStatement(fiscalYearId, departmentId);
        // Global trial balance for balance sheet KPIs (cash, receivables, payables are company-wide)
        const trial = await this.trialBalance(fiscalYearId);

        let cashBalance = 0;
        let receivables = 0;
        let payables = 0;
        let tvaCollected = 0;
        let tvaDeductible = 0;

        for (const item of trial.accounts) {
            const code = item.account.code;
            if (code.startsWith('5')) cashBalance += (item.debitBalance || 0) - (item.creditBalance || 0);
            if (code.startsWith('411')) receivables += item.debitBalance || 0;
            if (code.startsWith('401')) payables += item.creditBalance || 0;
            if (code === '443100') tvaCollected = item.creditBalance || 0;
            if (code === '443200') tvaDeductible = item.debitBalance || 0;
        }

        const result = {
            totalRevenue: incomeStmt.totalRevenue,
            totalExpenses: incomeStmt.totalExpenses,
            netIncome: incomeStmt.netIncome,
            cashBalance: Math.round(cashBalance * 100) / 100,
            receivables: Math.round(receivables * 100) / 100,
            payables: Math.round(payables * 100) / 100,
            tvaDue: Math.round((tvaCollected - tvaDeductible) * 100) / 100,
        };
        await this.cache.set(key, result, CACHE_TTL.REPORTS_FAST);
        return result;
    }

    /**
     * Tableau de flux de trésorerie
     * Based on class 5 (Trésorerie) account movements.
     * Debits = entrées (cash in), Credits = sorties (cash out)
     */
    async cashFlow(fiscalYearId: string) {
        const key = CACHE_KEYS.CASH_FLOW(fiscalYearId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

        // Monthly aggregates for chart
        const [monthRows] = await this.sequelize.query(`
            SELECT
                EXTRACT(MONTH FROM je."date")::int AS month,
                COALESCE(SUM(jel."debit"), 0)  AS entrees,
                COALESCE(SUM(jel."credit"), 0) AS sorties
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            JOIN accounts a ON a.id = jel."accountId"
            WHERE je."fiscalYearId" = :fiscalYearId
              AND je.status = 'VALIDATED'
              AND a.code LIKE '5%'
            GROUP BY EXTRACT(MONTH FROM je."date")
            ORDER BY month
        `, { replacements: { fiscalYearId } });

        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            entrees: 0,
            sorties: 0,
            net: 0,
        }));
        for (const row of monthRows as any[]) {
            const idx = Number(row.month) - 1;
            if (idx >= 0 && idx < 12) {
                months[idx].entrees = Math.round(Number(row.entrees) || 0);
                months[idx].sorties = Math.round(Number(row.sorties) || 0);
                months[idx].net = months[idx].entrees - months[idx].sorties;
            }
        }

        // Cumulative running balance
        let running = 0;
        for (const m of months) {
            running += m.net;
            (m as any).cumulative = Math.round(running);
        }

        // Detailed lines for the table
        const [lineRows] = await this.sequelize.query(`
            SELECT
                je."date",
                je."entryNumber",
                je.description,
                je.reference,
                je."sourceType",
                a.code AS "accountCode",
                a.name AS "accountName",
                jel."debit",
                jel."credit",
                jel."label"
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            JOIN accounts a ON a.id = jel."accountId"
            WHERE je."fiscalYearId" = :fiscalYearId
              AND je.status = 'VALIDATED'
              AND a.code LIKE '5%'
            ORDER BY je."date" ASC, je."entryNumber" ASC
        `, { replacements: { fiscalYearId } });

        const totalEntrees = months.reduce((s, m) => s + m.entrees, 0);
        const totalSorties = months.reduce((s, m) => s + m.sorties, 0);

        const result = {
            months,
            lines: lineRows,
            totalEntrees,
            totalSorties,
            netCashFlow: totalEntrees - totalSorties,
        };
        await this.cache.set(key, result, CACHE_TTL.REPORTS);
        return result;
    }

    /**
     * Balance à 6 colonnes SYSCOHADA
     * Colonnes: SI Débit / SI Crédit / Mvt Débit / Mvt Crédit / SF Débit / SF Crédit
     * SI = soldes d'ouverture = Σ écritures VALIDATED avant fromDate (all fiscal years, incl. AN)
     * M  = mouvements de la période [fromDate, toDate]
     * SF = solde final orienté selon la nature du compte
     * 3 contrôles d'équilibre renvoyés.
     */
    async sixColumnBalance(fiscalYearId: string, fromDate?: string, toDate?: string, departmentId?: string) {
        // Resolve period dates from fiscal year if not provided
        const fiscalYear = await this.sequelize.query(
            `SELECT "startDate", "endDate" FROM fiscal_years WHERE id = :id`,
            { replacements: { id: fiscalYearId }, type: 'SELECT' as any },
        ) as any[];
        const fy = fiscalYear[0];
        const periodStart: string = fromDate || fy?.startDate || '';
        const periodEnd: string = toDate || fy?.endDate || '';

        if (!periodStart || !periodEnd) throw new Error('Cannot resolve period dates for six-column balance');

        const deptFilter = departmentId ? `AND jel."departmentId" = '${departmentId}'` : '';

        // ── Opening balances (SI): all validated entries BEFORE periodStart ──
        const [siRows] = await this.sequelize.query(`
            SELECT
                jel."accountId",
                COALESCE(SUM(jel."debit"), 0)  AS si_debit,
                COALESCE(SUM(jel."credit"), 0) AS si_credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            WHERE je.status = 'VALIDATED'
              AND je."date" < :periodStart
              ${deptFilter}
            GROUP BY jel."accountId"
        `, { replacements: { periodStart } });

        // ── Period movements (M): validated entries in [periodStart, periodEnd] for this FY ──
        const [mRows] = await this.sequelize.query(`
            SELECT
                jel."accountId",
                COALESCE(SUM(jel."debit"), 0)  AS m_debit,
                COALESCE(SUM(jel."credit"), 0) AS m_credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            WHERE je."fiscalYearId" = :fiscalYearId
              AND je.status = 'VALIDATED'
              AND je."date" >= :periodStart
              AND je."date" <= :periodEnd
              ${deptFilter}
            GROUP BY jel."accountId"
        `, { replacements: { fiscalYearId, periodStart, periodEnd } });

        // Collect all account IDs
        const accountIds = new Set<string>([
            ...(siRows as any[]).map(r => r.accountId),
            ...(mRows as any[]).map(r => r.accountId),
        ]);

        if (accountIds.size === 0) {
            return {
                accounts: [],
                totals: { siDebit: 0, siCredit: 0, mvtDebit: 0, mvtCredit: 0, sfDebit: 0, sfCredit: 0 },
                equilibrium: { openingBalanced: true, movementsBalanced: true, closingBalanced: true },
            };
        }

        // Fetch account details
        const accounts = await this.accountModel.findAll({
            where: { id: Array.from(accountIds) as any },
            include: [{ model: AccountCategory, attributes: ['id', 'code', 'name'] }],
            order: [['code', 'ASC']],
        });
        const accountMap = new Map(accounts.map(a => [a.id, a.get({ plain: true }) as any]));

        const siMap = new Map((siRows as any[]).map(r => [r.accountId, r]));
        const mMap = new Map((mRows as any[]).map(r => [r.accountId, r]));

        let totSiD = 0, totSiC = 0, totMD = 0, totMC = 0, totSfD = 0, totSfC = 0;

        const rows = Array.from(accountIds).map(accountId => {
            const account = accountMap.get(accountId);
            const si = siMap.get(accountId);
            const m = mMap.get(accountId);

            const siD = Number(si?.si_debit || 0);
            const siC = Number(si?.si_credit || 0);
            const mD  = Number(m?.m_debit || 0);
            const mC  = Number(m?.m_credit || 0);

            // Determine account nature from type
            const type = account?.type || 'ASSET';
            const isDebitNature = type === 'ASSET' || type === 'EXPENSE';

            let sfD = 0, sfC = 0;
            if (isDebitNature) {
                const net = siD - siC + mD - mC;
                sfD = Math.max(0, net);
                sfC = net < 0 ? Math.abs(net) : 0;
            } else {
                const net = siC - siD + mC - mD;
                sfC = Math.max(0, net);
                sfD = net < 0 ? Math.abs(net) : 0;
            }

            totSiD += siD; totSiC += siC;
            totMD  += mD;  totMC  += mC;
            totSfD += sfD; totSfC += sfC;

            return { account, siDebit: siD, siCredit: siC, mvtDebit: mD, mvtCredit: mC, sfDebit: sfD, sfCredit: sfC };
        }).filter(r => r.account).sort((a, b) => (a.account?.code || '').localeCompare(b.account?.code || ''));

        const r2 = (n: number) => Math.round(n * 100) / 100;
        return {
            accounts: rows,
            totals: {
                siDebit:  r2(totSiD), siCredit:  r2(totSiC),
                mvtDebit: r2(totMD),  mvtCredit: r2(totMC),
                sfDebit:  r2(totSfD), sfCredit:  r2(totSfC),
            },
            equilibrium: {
                openingBalanced:   Math.abs(totSiD - totSiC) < 0.01,
                movementsBalanced: Math.abs(totMD  - totMC)  < 0.01,
                closingBalanced:   Math.abs(totSfD - totSfC) < 0.01,
            },
        };
    }

    /**
     * Balance auxiliaire — drill-down depuis un compte collectif vers ses sous-comptes nominatifs.
     * Renvoie les mouvements groupés par auxiliaryAccountId pour la période du fiscal year.
     */
    async auxiliaryBalance(fiscalYearId: string, collectiveAccountId: string) {
        const [rows] = await this.sequelize.query(`
            SELECT
                jel."auxiliaryAccountId",
                a.code AS "auxCode",
                a.name AS "auxName",
                a."thirdPartyType",
                a."thirdPartyId",
                COALESCE(SUM(jel."debit"),  0) AS total_debit,
                COALESCE(SUM(jel."credit"), 0) AS total_credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel."journalEntryId"
            LEFT JOIN accounts a ON a.id = jel."auxiliaryAccountId"
            WHERE je."fiscalYearId" = :fiscalYearId
              AND je.status = 'VALIDATED'
              AND jel."accountId" = :collectiveAccountId
              AND jel."auxiliaryAccountId" IS NOT NULL
            GROUP BY jel."auxiliaryAccountId", a.code, a.name, a."thirdPartyType", a."thirdPartyId"
            ORDER BY a.code ASC
        `, { replacements: { fiscalYearId, collectiveAccountId } });

        // Concordance: collective balance should equal sum of auxiliaries
        const collectiveData = await this.lineModel.findAll({
            where: { accountId: collectiveAccountId } as any,
            attributes: [
                [this.sequelize.fn('SUM', this.sequelize.col('JournalEntryLine.debit')), 'totalDebit'],
                [this.sequelize.fn('SUM', this.sequelize.col('JournalEntryLine.credit')), 'totalCredit'],
            ],
            include: [{
                model: JournalEntry,
                where: { fiscalYearId, status: 'VALIDATED' },
                attributes: [],
            }],
            raw: true,
        } as any);

        const collectiveTotals = (collectiveData[0] as any) || { totalDebit: 0, totalCredit: 0 };
        const auxDebitSum  = (rows as any[]).reduce((s, r) => s + Number(r.total_debit), 0);
        const auxCreditSum = (rows as any[]).reduce((s, r) => s + Number(r.total_credit), 0);

        const concordant =
            Math.abs(Number(collectiveTotals.totalDebit) - auxDebitSum) < 0.01 &&
            Math.abs(Number(collectiveTotals.totalCredit) - auxCreditSum) < 0.01;

        return {
            auxiliaries: (rows as any[]).map(r => ({
                auxiliaryAccountId: r.auxiliaryAccountId,
                code: r.auxCode,
                name: r.auxName,
                thirdPartyType: r.thirdPartyType,
                thirdPartyId: r.thirdPartyId,
                totalDebit: Number(r.total_debit),
                totalCredit: Number(r.total_credit),
                balance: Number(r.total_debit) - Number(r.total_credit),
            })),
            concordant,
            collectiveTotals: {
                totalDebit: Number(collectiveTotals.totalDebit),
                totalCredit: Number(collectiveTotals.totalCredit),
            },
        };
    }

    /**
     * Monthly revenue vs expenses breakdown for the bar chart.
     * Queries journal entry lines grouped by month, with revenue (class 7)
     * and expenses (class 6) separated.
     */
    async monthlySummary(fiscalYearId: string) {
        const key = CACHE_KEYS.MONTHLY_SUMMARY(fiscalYearId);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

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

        await this.cache.set(key, months, CACHE_TTL.REPORTS);
        return months;
    }
}

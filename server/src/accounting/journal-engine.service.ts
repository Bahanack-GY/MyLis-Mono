import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { Journal } from '../models/journal.model';
import { Account } from '../models/account.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { CHARGE_NATURE_ACCOUNT_MAP, DEFAULT_EXPENSE_ACCOUNT } from './syscohada-seed';
import { CacheService } from '../cache/cache.service';
import { CACHE_PATTERNS } from '../cache/cache.keys';

@Injectable()
export class JournalEngineService {
    private readonly logger = new Logger(JournalEngineService.name);

    constructor(
        @InjectModel(JournalEntry)
        private entryModel: typeof JournalEntry,
        @InjectModel(JournalEntryLine)
        private lineModel: typeof JournalEntryLine,
        @InjectModel(Journal)
        private journalModel: typeof Journal,
        @InjectModel(Account)
        private accountModel: typeof Account,
        @InjectModel(FiscalYear)
        private fiscalYearModel: typeof FiscalYear,
        @InjectConnection()
        private sequelize: Sequelize,
        private cache: CacheService,
    ) {}

    // ===== HELPERS =====

    private async getJournalByCode(code: string): Promise<Journal> {
        const journal = await this.journalModel.findOne({ where: { code } });
        if (!journal) {
            this.logger.warn(`Journal ${code} not found — skipping auto-entry. Run seed first.`);
            return null as any;
        }
        return journal;
    }

    private async getAccountByCode(code: string): Promise<Account | null> {
        return this.accountModel.findOne({ where: { code } });
    }

    private async getOpenFiscalYear(date: string): Promise<FiscalYear | null> {
        return this.fiscalYearModel.findOne({
            where: {
                status: 'OPEN',
                startDate: { [Op.lte]: date },
                endDate: { [Op.gte]: date },
            },
        });
    }

    private async generateEntryNumber(journalCode: string): Promise<string> {
        return this.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' as any }, async (t) => {
            const year = new Date().getFullYear();
            const prefix = `${journalCode}-${year}-`;
            const last = await this.entryModel.findOne({
                where: { entryNumber: { [Op.like]: `${prefix}%` } },
                order: [['entryNumber', 'DESC']],
                lock: true,
                transaction: t,
            });
            const nextNum = last
                ? parseInt(last.entryNumber.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(5, '0')}`;
        });
    }

    private async createAutoEntry(params: {
        journalCode: string;
        date: string;
        description: string;
        reference: string;
        sourceType: string;
        sourceId: string;
        lines: { accountCode: string; debit: number; credit: number; label?: string; departmentId?: string | null }[];
        userId: string;
    }): Promise<JournalEntry | null> {
        const journal = await this.getJournalByCode(params.journalCode);
        if (!journal) return null;

        const fiscalYear = await this.getOpenFiscalYear(params.date);
        if (!fiscalYear) {
            this.logger.warn(`No open fiscal year for date ${params.date} — skipping auto-entry`);
            return null;
        }

        // Resolve account codes to IDs
        const resolvedLines: { accountId: string; debit: number; credit: number; label?: string; departmentId?: string | null }[] = [];
        for (const line of params.lines) {
            const account = await this.getAccountByCode(line.accountCode);
            if (!account) {
                this.logger.warn(`Account ${line.accountCode} not found — skipping auto-entry`);
                return null;
            }
            resolvedLines.push({
                accountId: account.id,
                debit: Math.round((line.debit || 0) * 100) / 100,
                credit: Math.round((line.credit || 0) * 100) / 100,
                label: line.label,
                departmentId: line.departmentId ?? null,
            });
        }

        const totalDebit = resolvedLines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = resolvedLines.reduce((sum, l) => sum + l.credit, 0);

        const entryNumber = await this.generateEntryNumber(params.journalCode);

        const entry = await this.sequelize.transaction(async (t) => {
            const created = await this.entryModel.create({
                entryNumber,
                journalId: journal.id,
                fiscalYearId: fiscalYear.id,
                date: params.date,
                description: params.description,
                reference: params.reference,
                sourceType: params.sourceType,
                sourceId: params.sourceId,
                status: 'VALIDATED',
                validatedAt: new Date(),
                createdByUserId: params.userId,
                totalDebit: Math.round(totalDebit * 100) / 100,
                totalCredit: Math.round(totalCredit * 100) / 100,
            } as any, { transaction: t });

            await this.lineModel.bulkCreate(
                resolvedLines.map(l => ({
                    journalEntryId: created.id,
                    ...l,
                })),
                { transaction: t },
            );

            return created;
        });

        // Invalidate AFTER the transaction commits — fire-and-forget, never block the caller.
        this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS).catch(() => {});
        return entry;
    }

    // ===== HELPERS (continued) =====

    /** Delete all journal entries (and their lines) tied to a given source. */
    private async deleteEntriesForSource(sourceType: string, sourceId: string): Promise<void> {
        const entries = await this.entryModel.findAll({ where: { sourceType, sourceId } });
        if (entries.length === 0) return;
        for (const entry of entries) {
            await this.lineModel.destroy({ where: { journalEntryId: entry.id } });
            await entry.destroy();
        }
        this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS).catch(() => {});
    }

    // ===== EVENT HANDLERS =====

    /**
     * Called when an invoice is sent (CREATED → SENT)
     * Creates: Debit 411000 Clients / Credit 706000 Services + Credit 443100 TVA collectée
     */
    async onInvoiceSent(invoice: any, userId: string): Promise<void> {
        try {
            const date = invoice.sentAt
                ? new Date(invoice.sentAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            const deptId = invoice.departmentId || null;

            const lines: { accountCode: string; debit: number; credit: number; label?: string; departmentId?: string | null }[] = [
                { accountCode: '411000', debit: Number(invoice.total), credit: 0, label: `Client - ${invoice.invoiceNumber}`, departmentId: deptId },
                { accountCode: '706000', debit: 0, credit: Number(invoice.subtotal), label: `Vente - ${invoice.invoiceNumber}`, departmentId: deptId },
            ];

            const taxAmount = Number(invoice.taxAmount) || 0;
            if (taxAmount > 0) {
                lines.push({ accountCode: '443100', debit: 0, credit: taxAmount, label: `TVA collectée - ${invoice.invoiceNumber}`, departmentId: deptId });
            }

            await this.createAutoEntry({
                journalCode: 'VTE',
                date,
                description: `Facture ${invoice.invoiceNumber} émise`,
                reference: invoice.invoiceNumber,
                sourceType: 'INVOICE',
                sourceId: invoice.id,
                lines,
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for invoice sent: ${error.message}`);
        }
    }

    /**
     * Called when an invoice is paid (SENT → PAID).
     * amount = remaining after any acomptes already collected (defaults to invoice.total).
     * Creates: Debit 521000 Banque / Credit 411000 Clients
     */
    async onInvoicePaid(invoice: any, userId: string, amount?: number): Promise<void> {
        try {
            const paymentAmount = amount !== undefined ? amount : Number(invoice.total);
            if (paymentAmount <= 0) return;

            const date = invoice.paidAt
                ? new Date(invoice.paidAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            const deptId = invoice.departmentId || null;

            await this.createAutoEntry({
                journalCode: 'BQ',
                date,
                description: `Encaissement facture ${invoice.invoiceNumber}`,
                reference: invoice.invoiceNumber,
                sourceType: 'INVOICE',
                sourceId: invoice.id,
                lines: [
                    { accountCode: '521000', debit: paymentAmount, credit: 0, label: `Encaissement - ${invoice.invoiceNumber}`, departmentId: deptId },
                    { accountCode: '411000', debit: 0, credit: paymentAmount, label: `Solde client - ${invoice.invoiceNumber}`, departmentId: deptId },
                ],
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for invoice paid: ${error.message}`);
        }
    }

    /**
     * Called when a SENT invoice is rejected — reverses the onInvoiceSent entry.
     * Creates: Credit 411000 Clients / Debit 706000 Services + Debit 443100 TVA collectée
     */
    async onInvoiceRejected(invoice: any, userId: string): Promise<void> {
        try {
            const date = new Date().toISOString().split('T')[0];
            const deptId = invoice.departmentId || null;

            const lines: { accountCode: string; debit: number; credit: number; label?: string; departmentId?: string | null }[] = [
                { accountCode: '411000', debit: 0, credit: Number(invoice.total), label: `Annulation client - ${invoice.invoiceNumber}`, departmentId: deptId },
                { accountCode: '706000', debit: Number(invoice.subtotal), credit: 0, label: `Annulation vente - ${invoice.invoiceNumber}`, departmentId: deptId },
            ];

            const taxAmount = Number(invoice.taxAmount) || 0;
            if (taxAmount > 0) {
                lines.push({ accountCode: '443100', debit: taxAmount, credit: 0, label: `Annulation TVA - ${invoice.invoiceNumber}`, departmentId: deptId });
            }

            await this.createAutoEntry({
                journalCode: 'VTE',
                date,
                description: `Annulation facture ${invoice.invoiceNumber}`,
                reference: invoice.invoiceNumber,
                sourceType: 'INVOICE',
                sourceId: invoice.id,
                lines,
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create reversal entry for rejected invoice: ${error.message}`);
        }
    }

    /**
     * Called when an acompte is created (partial client payment).
     * Creates: Debit 521000 Banque / Credit 411000 Clients
     */
    async onAcompteCreated(acompte: any, parentInvoice: any, userId: string): Promise<void> {
        try {
            const date = new Date(acompte.issueDate).toISOString().split('T')[0];
            const deptId = acompte.departmentId || parentInvoice.departmentId || null;

            await this.createAutoEntry({
                journalCode: 'BQ',
                date,
                description: `Acompte sur facture ${parentInvoice.invoiceNumber}`,
                reference: acompte.acompteNumber,
                sourceType: 'INVOICE',
                sourceId: acompte.id,
                lines: [
                    { accountCode: '521000', debit: Number(acompte.total), credit: 0, label: `Acompte - ${acompte.acompteNumber}`, departmentId: deptId },
                    { accountCode: '411000', debit: 0, credit: Number(acompte.total), label: `Règlement partiel - ${parentInvoice.invoiceNumber}`, departmentId: deptId },
                ],
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for acompte: ${error.message}`);
        }
    }

    /**
     * Called when a fund movement is created.
     * APPORT: Débit 521000 Banque / Crédit 461000 Associés comptes courants
     * RETRAIT: Débit 461000 Associés comptes courants / Crédit 521000 Banque
     */
    async onFundMovement(movement: any, userId: string): Promise<string | null> {
        try {
            const amount = Number(movement.amount);
            const date = movement.date || new Date().toISOString().split('T')[0];
            const isApport = movement.type === 'APPORT';
            const label = isApport
                ? `Apport - ${movement.description}`
                : `Retrait - ${movement.description}`;

            const entry = await this.createAutoEntry({
                journalCode: 'OD',
                date,
                description: isApport
                    ? `Apport en compte courant: ${movement.description}`
                    : `Retrait en compte courant: ${movement.description}`,
                reference: movement.id,
                sourceType: 'FUND_MOVEMENT',
                sourceId: movement.id,
                lines: isApport
                    ? [
                        { accountCode: '521000', debit: amount, credit: 0, label },
                        { accountCode: '461000', debit: 0, credit: amount, label },
                    ]
                    : [
                        { accountCode: '461000', debit: amount, credit: 0, label },
                        { accountCode: '521000', debit: 0, credit: amount, label },
                    ],
                userId,
            });
            return entry?.getDataValue('entryNumber') ?? null;
        } catch (error) {
            this.logger.error(`Failed to create journal entry for fund movement: ${error.message}`);
            return null;
        }
    }

    /**
     * Called when a fund movement is deleted — removes its journal entry.
     */
    async onFundMovementDeleted(movementId: string): Promise<void> {
        try {
            await this.deleteEntriesForSource('FUND_MOVEMENT', movementId);
        } catch (error) {
            this.logger.error(`Failed to delete journal entry for fund movement: ${error.message}`);
        }
    }

    /**
     * Called when an expense is deleted — removes its journal entry.
     */
    async onExpenseDeleted(expenseId: string): Promise<void> {
        try {
            await this.deleteEntriesForSource('EXPENSE', expenseId);
        } catch (error) {
            this.logger.error(`Failed to delete journal entry for expense: ${error.message}`);
        }
    }

    /**
     * Called when an expense is updated — replaces the existing journal entry.
     */
    async onExpenseUpdated(expense: any, userId: string): Promise<void> {
        try {
            if (expense.source === 'PAYROLL') return; // payroll entries managed separately
            await this.deleteEntriesForSource('EXPENSE', expense.id);
            await this.onExpenseCreated(expense, userId);
        } catch (error) {
            this.logger.error(`Failed to update journal entry for expense: ${error.message}`);
        }
    }

    /**
     * Called when an acompte is updated — replaces the existing journal entry.
     */
    async onAcompteUpdated(acompte: any, parentInvoice: any, userId: string): Promise<void> {
        try {
            await this.deleteEntriesForSource('INVOICE', acompte.id);
            await this.onAcompteCreated(acompte, parentInvoice, userId);
        } catch (error) {
            this.logger.error(`Failed to update journal entry for acompte: ${error.message}`);
        }
    }

    /**
     * Called when an expense is created
     * Creates: Debit 6XXXXX Charge / Credit 521000 Banque
     */
    async onExpenseCreated(expense: any, userId: string): Promise<void> {
        try {
            const chargeNature = expense.chargeNature || '';
            const accountCode = CHARGE_NATURE_ACCOUNT_MAP[chargeNature] || DEFAULT_EXPENSE_ACCOUNT;
            const date = expense.date || new Date().toISOString().split('T')[0];
            const deptId = expense.departmentId || null;

            await this.createAutoEntry({
                journalCode: 'BQ',
                date,
                description: `Dépense: ${expense.title}`,
                reference: expense.id,
                sourceType: 'EXPENSE',
                sourceId: expense.id,
                lines: [
                    { accountCode, debit: Number(expense.amount), credit: 0, label: expense.title, departmentId: deptId },
                    { accountCode: '521000', debit: 0, credit: Number(expense.amount), label: `Paiement - ${expense.title}`, departmentId: deptId },
                ],
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for expense: ${error.message}`);
        }
    }

    /**
     * SYSCOHADA 3-écriture journal de paie (Cameroun 2026)
     *
     * Écriture 1 (Journal PAI): charges salariales et retenues
     *   D 6611xx Rémunérations brutes
     *   C 421xxx Personnel (net à payer — compte auxiliaire nominatif si fourni)
     *   C 431100 CNPS PVID salariale
     *   C 442100 IRPP + CAC retenus
     *   C 442800 CFC salarial + TDL + RAV
     *   C 425xxx Acomptes récupérés (si > 0)
     *
     * Écriture 2 (Journal PAI): charges patronales
     *   D 664000 CNPS patronal (PVID + PF + AT/MP)
     *   D 641300 CFC patronal
     *   D 641400 FNE
     *   C 431200 CNPS patronale due
     *   C 442800 CFC + FNE dus à l'État
     *
     * Écriture 3 (Journal BQ): règlement (optionnel, déclenché par pay())
     *   D 421xxx Personnel
     *   C 521000 Banque
     */
    async onSalaryPaid(params: {
        employeeName: string;
        baseSalary?: number;
        grossSalary: number;
        netSalary: number;
        // 2026 fields
        pvidEmployee?: number;
        pvidEmployer?: number;
        cnpsFamilyAllowance?: number;
        atmp?: number;
        cfcEmployee?: number;
        cfcEmployer?: number;
        fne?: number;
        irpp?: number;
        cac?: number;
        rav?: number;
        tdl?: number;
        advancesRecovered?: number;
        // Legacy compat
        cnpsEmployee?: number;
        cnpsEmployer?: number;
        cfc?: number;
        communalTax?: number;
        // Routing
        auxiliaryAccountCode?: string | null; // e.g. '421000001' for the specific employee
        date: string;
        sourceId: string;
        userId: string;
    }): Promise<void> {
        try {
            const name = params.employeeName;

            // Resolve amounts — prefer 2026 fields, fall back to legacy
            const pvidEmp    = params.pvidEmployee       ?? params.cnpsEmployee ?? 0;
            const pvidPat    = params.pvidEmployer       ?? 0;
            const pfPat      = params.cnpsFamilyAllowance ?? 0;
            const atmpPat    = params.atmp               ?? 0;
            const cfcEmp     = params.cfcEmployee        ?? params.cfc ?? 0;
            const cfcPat     = params.cfcEmployer        ?? 0;
            const fnePat     = params.fne                ?? 0;
            const irppAmt    = params.irpp               ?? 0;
            const cacAmt     = params.cac                ?? params.communalTax ?? 0;
            const ravAmt     = params.rav                ?? 0;
            const tdlAmt     = params.tdl                ?? 0;
            const advances   = params.advancesRecovered  ?? 0;

            // Gross salary account: use 661100 (Appointements et salaires)
            const grossAccount = '661100';
            // Net salary destination: nominative aux if available, else collective 421000
            const netAccount = params.auxiliaryAccountCode || '421000';

            // ─ Écriture 1: Journal de paie ─
            const e1Lines: { accountCode: string; debit: number; credit: number; label?: string }[] = [
                { accountCode: grossAccount, debit: params.grossSalary, credit: 0, label: `Salaire brut — ${name}` },
                { accountCode: netAccount,   debit: 0, credit: params.netSalary, label: `Net à payer — ${name}` },
            ];

            if (pvidEmp > 0) {
                e1Lines.push({ accountCode: '431100', debit: 0, credit: pvidEmp, label: `CNPS PVID salarial — ${name}` });
            }

            const fiscalRetenues = irppAmt + cacAmt;
            if (fiscalRetenues > 0) {
                e1Lines.push({ accountCode: '442100', debit: 0, credit: fiscalRetenues, label: `IRPP + CAC — ${name}` });
            }

            const otherFiscal = cfcEmp + ravAmt + tdlAmt;
            if (otherFiscal > 0) {
                e1Lines.push({ accountCode: '442800', debit: 0, credit: otherFiscal, label: `CFC + TDL + RAV — ${name}` });
            }

            if (advances > 0) {
                e1Lines.push({ accountCode: '425000', debit: advances, credit: 0, label: `Acomptes récupérés — ${name}` });
            }

            await this.createAutoEntry({
                journalCode: 'PAI',
                date: params.date,
                description: `Journal de paie — ${name}`,
                reference: params.sourceId,
                sourceType: 'SALARY',
                sourceId: params.sourceId,
                lines: e1Lines,
                userId: params.userId,
            });

            // ─ Écriture 2: Charges patronales ─
            const totalCnpsPat = pvidPat + pfPat + atmpPat;
            const totalCfcFne  = cfcPat + fnePat;

            if (totalCnpsPat > 0 || totalCfcFne > 0) {
                const e2Lines: { accountCode: string; debit: number; credit: number; label?: string }[] = [];

                if (totalCnpsPat > 0) {
                    e2Lines.push({ accountCode: '664000', debit: totalCnpsPat, credit: 0, label: `CNPS patronal (PVID+PF+AT/MP) — ${name}` });
                    e2Lines.push({ accountCode: '431200', debit: 0, credit: totalCnpsPat, label: `CNPS patronal dû — ${name}` });
                }
                if (cfcPat > 0) {
                    e2Lines.push({ accountCode: '641300', debit: cfcPat, credit: 0, label: `CFC patronal — ${name}` });
                    e2Lines.push({ accountCode: '442800', debit: 0, credit: cfcPat, label: `CFC patronal dû — ${name}` });
                }
                if (fnePat > 0) {
                    e2Lines.push({ accountCode: '641400', debit: fnePat, credit: 0, label: `FNE — ${name}` });
                    e2Lines.push({ accountCode: '442800', debit: 0, credit: fnePat, label: `FNE dû — ${name}` });
                }

                // Consolidate 442800 credits if both CFC and FNE exist (avoid duplicate lines)
                const consolidatedLines = this.consolidateCreditLines(e2Lines, '442800');

                await this.createAutoEntry({
                    journalCode: 'PAI',
                    date: params.date,
                    description: `Charges patronales — ${name}`,
                    reference: params.sourceId,
                    sourceType: 'SALARY',
                    sourceId: `${params.sourceId}-pat`,
                    lines: consolidatedLines,
                    userId: params.userId,
                });
            }
        } catch (error) {
            this.logger.error(`Failed to create journal entry for salary: ${error.message}`);
        }
    }

    /** Consolidate multiple credit lines for the same account code into one. */
    private consolidateCreditLines(
        lines: { accountCode: string; debit: number; credit: number; label?: string }[],
        accountCode: string,
    ) {
        let consolidated = 0;
        const filtered = lines.filter(l => {
            if (l.accountCode === accountCode && l.credit > 0) {
                consolidated += l.credit;
                return false;
            }
            return true;
        });
        if (consolidated > 0) {
            filtered.push({ accountCode, debit: 0, credit: consolidated, label: `Retenues fiscales et sociales dues` });
        }
        return filtered;
    }

    /**
     * Called when a credit note is validated
     * Creates reversal entry in sales journal
     */
    async onCreditNoteValidated(creditNote: any, invoice: any, userId: string): Promise<void> {
        try {
            const date = new Date().toISOString().split('T')[0];

            const lines: { accountCode: string; debit: number; credit: number; label?: string }[] = [
                {
                    accountCode: '706000',
                    debit: Number(creditNote.amount),
                    credit: 0,
                    label: `Avoir ${creditNote.creditNoteNumber}`,
                },
            ];

            const taxAmount = Number(creditNote.taxAmount) || 0;
            if (taxAmount > 0) {
                lines.push({
                    accountCode: '443100',
                    debit: taxAmount,
                    credit: 0,
                    label: `TVA avoir ${creditNote.creditNoteNumber}`,
                });
            }

            lines.push({
                accountCode: '411000',
                debit: 0,
                credit: Number(creditNote.total),
                label: `Client - Avoir ${creditNote.creditNoteNumber}`,
            });

            await this.createAutoEntry({
                journalCode: 'VTE',
                date,
                description: `Avoir ${creditNote.creditNoteNumber} sur facture ${invoice.invoiceNumber}`,
                reference: creditNote.creditNoteNumber,
                sourceType: 'CREDIT_NOTE',
                sourceId: creditNote.id,
                lines,
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for credit note: ${error.message}`);
        }
    }

    /**
     * Called when a supplier invoice is validated (DRAFT → VALIDATED)
     * Creates: Debit 601000 Achats + Debit 445200 TVA déductible / Credit 401000 Fournisseurs
     */
    async onSupplierInvoiceValidated(params: {
        invoiceId: string;
        supplierName: string;
        invoiceNumber: string;
        totalHT: number;
        taxAmount: number;
        totalTTC: number;
        date: string;
        userId: string;
    }): Promise<void> {
        try {
            const lines: { accountCode: string; debit: number; credit: number; label?: string }[] = [
                {
                    accountCode: '601000',
                    debit: params.totalHT,
                    credit: 0,
                    label: `Achats - ${params.invoiceNumber}`,
                },
            ];

            if (params.taxAmount > 0) {
                lines.push({
                    accountCode: '443200',
                    debit: params.taxAmount,
                    credit: 0,
                    label: `TVA déductible - ${params.invoiceNumber}`,
                });
            }

            lines.push({
                accountCode: '401000',
                debit: 0,
                credit: params.totalTTC,
                label: `${params.supplierName} - ${params.invoiceNumber}`,
            });

            await this.createAutoEntry({
                journalCode: 'ACH',
                date: params.date,
                description: `Facture fournisseur ${params.invoiceNumber} - ${params.supplierName}`,
                reference: params.invoiceNumber,
                sourceType: 'SUPPLIER_INVOICE',
                sourceId: params.invoiceId,
                lines,
                userId: params.userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for supplier invoice validated: ${error.message}`);
        }
    }

    /**
     * Called when a supplier invoice is paid (VALIDATED → PAID)
     * Creates: Debit 401000 Fournisseurs / Credit 521000 Banque
     */
    async onSupplierInvoicePaid(params: {
        invoiceId: string;
        supplierName: string;
        invoiceNumber: string;
        totalTTC: number;
        date: string;
        userId: string;
    }): Promise<void> {
        try {
            await this.createAutoEntry({
                journalCode: 'BQ',
                date: params.date,
                description: `Paiement fournisseur ${params.invoiceNumber} - ${params.supplierName}`,
                reference: params.invoiceNumber,
                sourceType: 'SUPPLIER_INVOICE',
                sourceId: params.invoiceId,
                lines: [
                    {
                        accountCode: '401000',
                        debit: params.totalTTC,
                        credit: 0,
                        label: `${params.supplierName} - ${params.invoiceNumber}`,
                    },
                    {
                        accountCode: '521000',
                        debit: 0,
                        credit: params.totalTTC,
                        label: `Paiement - ${params.invoiceNumber}`,
                    },
                ],
                userId: params.userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for supplier invoice paid: ${error.message}`);
        }
    }

    // ===== OPENING BALANCES =====

    /**
     * Return the current opening-balance lines for a fiscal year (sourceType = OPENING_BALANCE).
     */
    async getOpeningBalances(fiscalYearId: string): Promise<{ accountCode: string; accountName: string; debit: number; credit: number }[]> {
        const entries = await this.entryModel.findAll({ where: { sourceType: 'OPENING_BALANCE', sourceId: fiscalYearId } });
        if (entries.length === 0) return [];

        const lines = await this.lineModel.findAll({
            where: { journalEntryId: entries.map(e => e.id) as any },
            include: [{ model: Account, as: 'account', attributes: ['code', 'name'] }],
        });

        return lines.map((l: any) => ({
            accountCode: l.account?.code || '',
            accountName: l.account?.name || '',
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
        }));
    }

    /**
     * Import (replace) opening balances for a fiscal year.
     * Creates a single OD entry dated startDate-1 so the SI query picks it up.
     */
    async importOpeningBalances(params: {
        fiscalYearId: string;
        startDate: string;
        balances: { accountCode: string; debit: number; credit: number }[];
        userId: string;
    }): Promise<void> {
        await this.deleteEntriesForSource('OPENING_BALANCE', params.fiscalYearId);

        const nonZero = params.balances.filter(b => b.debit > 0 || b.credit > 0);
        if (nonZero.length === 0) return;

        const resolvedLines: { accountId: string; debit: number; credit: number; label: string }[] = [];
        for (const b of nonZero) {
            const account = await this.getAccountByCode(b.accountCode);
            if (!account) { this.logger.warn(`Opening balance: account ${b.accountCode} not found — skipped`); continue; }
            resolvedLines.push({ accountId: account.id, debit: Math.round(b.debit), credit: Math.round(b.credit), label: `Solde d'ouverture — ${account.name}` });
        }
        if (resolvedLines.length === 0) return;

        // Date the entry one day before period start so SI query (date < periodStart) captures it
        const d = new Date(params.startDate);
        d.setDate(d.getDate() - 1);
        const dateStr = d.toISOString().split('T')[0];

        const journal = await this.getJournalByCode('OD');
        if (!journal) return;

        const totalDebit  = resolvedLines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0);
        const entryNumber = await this.generateEntryNumber('OD');

        await this.sequelize.transaction(async (t) => {
            const entry = await this.entryModel.create({
                entryNumber,
                journalId: journal.id,
                fiscalYearId: params.fiscalYearId,
                date: dateStr,
                description: `Soldes d'ouverture — Reprise des balances`,
                reference: `AN-${params.fiscalYearId.substring(0, 8).toUpperCase()}`,
                sourceType: 'OPENING_BALANCE',
                sourceId: params.fiscalYearId,
                status: 'VALIDATED',
                validatedAt: new Date(),
                createdByUserId: params.userId,
                totalDebit: Math.round(totalDebit),
                totalCredit: Math.round(totalCredit),
            } as any, { transaction: t });

            await this.lineModel.bulkCreate(
                resolvedLines.map(l => ({ journalEntryId: entry.id, ...l })),
                { transaction: t },
            );
        });

        this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS).catch(() => {});
    }

    // ===== CARWASH INTEGRATION =====

    /** Upsert daily revenue journal entry for a carwash station. */
    async onCarwashRevenueSynced(params: {
        stationId: number;
        stationName: string;
        date: string;
        amount: number;
        departmentId: string;
        userId: string;
    }): Promise<void> {
        if (params.amount <= 0) return;
        const sourceId = `carwash-rev-${params.stationId}-${params.date}`;
        await this.deleteEntriesForSource('CARWASH_REVENUE', sourceId);
        try {
            await this.createAutoEntry({
                journalCode: 'VTE',
                date: params.date,
                description: `Recettes carwash ${params.stationName} — ${params.date}`,
                reference: `CW-REV-${params.stationId}-${params.date}`,
                sourceType: 'CARWASH_REVENUE',
                sourceId,
                lines: [
                    {
                        accountCode: '521000',
                        debit: params.amount,
                        credit: 0,
                        label: `Recettes ${params.stationName}`,
                        departmentId: params.departmentId,
                    },
                    {
                        accountCode: '706000',
                        debit: 0,
                        credit: params.amount,
                        label: `Prestations carwash ${params.stationName}`,
                        departmentId: params.departmentId,
                    },
                ],
                userId: params.userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create carwash revenue entry: ${error.message}`);
        }
    }

    /** Upsert daily expense journal entry for a carwash station. */
    async onCarwashExpenseSynced(params: {
        stationId: number;
        stationName: string;
        date: string;
        amount: number;
        departmentId: string;
        userId: string;
    }): Promise<void> {
        if (params.amount <= 0) return;
        const sourceId = `carwash-exp-${params.stationId}-${params.date}`;
        await this.deleteEntriesForSource('CARWASH_EXPENSE', sourceId);
        try {
            await this.createAutoEntry({
                journalCode: 'OD',
                date: params.date,
                description: `Charges carwash ${params.stationName} — ${params.date}`,
                reference: `CW-EXP-${params.stationId}-${params.date}`,
                sourceType: 'CARWASH_EXPENSE',
                sourceId,
                lines: [
                    {
                        accountCode: '605000',
                        debit: params.amount,
                        credit: 0,
                        label: `Charges ${params.stationName}`,
                        departmentId: params.departmentId,
                    },
                    {
                        accountCode: '521000',
                        debit: 0,
                        credit: params.amount,
                        label: `Sortie trésorerie ${params.stationName}`,
                        departmentId: params.departmentId,
                    },
                ],
                userId: params.userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create carwash expense entry: ${error.message}`);
        }
    }
}

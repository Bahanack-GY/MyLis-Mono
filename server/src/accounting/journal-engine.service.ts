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
     * Called when salary is paid
     * Creates full payroll journal entry with all deductions
     */
    async onSalaryPaid(params: {
        employeeName: string;
        grossSalary: number;
        netSalary: number;
        cnpsEmployee: number;
        cnpsEmployer: number;
        irpp: number;
        cfc: number;
        communalTax: number;
        date: string;
        sourceId: string;
        userId: string;
    }): Promise<void> {
        try {
            const lines: { accountCode: string; debit: number; credit: number; label?: string }[] = [];

            // Debit: Personnel charges (gross salary)
            lines.push({
                accountCode: '641000',
                debit: params.grossSalary,
                credit: 0,
                label: `Salaire brut - ${params.employeeName}`,
            });

            // Credit: Net salary payable
            lines.push({
                accountCode: '421000',
                debit: 0,
                credit: params.netSalary,
                label: `Salaire net - ${params.employeeName}`,
            });

            // Credit: CNPS employee part
            if (params.cnpsEmployee > 0) {
                lines.push({
                    accountCode: '431100',
                    debit: 0,
                    credit: params.cnpsEmployee,
                    label: `CNPS salariale - ${params.employeeName}`,
                });
            }

            // Credit: IRPP
            if (params.irpp > 0) {
                lines.push({
                    accountCode: '442000',
                    debit: 0,
                    credit: params.irpp,
                    label: `IRPP - ${params.employeeName}`,
                });
            }

            // Credit: CFC
            if (params.cfc > 0) {
                lines.push({
                    accountCode: '447000',
                    debit: 0,
                    credit: params.cfc,
                    label: `CFC - ${params.employeeName}`,
                });
            }

            // Credit: Communal tax
            if (params.communalTax > 0) {
                lines.push({
                    accountCode: '448000',
                    debit: 0,
                    credit: params.communalTax,
                    label: `Centimes communaux - ${params.employeeName}`,
                });
            }

            await this.createAutoEntry({
                journalCode: 'OD',
                date: params.date,
                description: `Salaire ${params.employeeName}`,
                reference: params.sourceId,
                sourceType: 'SALARY',
                sourceId: params.sourceId,
                lines,
                userId: params.userId,
            });

            // Employer charges in a separate entry
            if (params.cnpsEmployer > 0) {
                await this.createAutoEntry({
                    journalCode: 'OD',
                    date: params.date,
                    description: `Charges patronales ${params.employeeName}`,
                    reference: params.sourceId,
                    sourceType: 'SALARY',
                    sourceId: params.sourceId,
                    lines: [
                        {
                            accountCode: '645100',
                            debit: params.cnpsEmployer,
                            credit: 0,
                            label: `CNPS patronale - ${params.employeeName}`,
                        },
                        {
                            accountCode: '431200',
                            debit: 0,
                            credit: params.cnpsEmployer,
                            label: `CNPS patronale due - ${params.employeeName}`,
                        },
                    ],
                    userId: params.userId,
                });
            }
        } catch (error) {
            this.logger.error(`Failed to create journal entry for salary: ${error.message}`);
        }
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
}

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
import { EXPENSE_CATEGORY_ACCOUNT_MAP, DEFAULT_EXPENSE_ACCOUNT } from './syscohada-seed';

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
        lines: { accountCode: string; debit: number; credit: number; label?: string }[];
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
        const resolvedLines: { accountId: string; debit: number; credit: number; label?: string }[] = [];
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
            });
        }

        const totalDebit = resolvedLines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = resolvedLines.reduce((sum, l) => sum + l.credit, 0);

        const entryNumber = await this.generateEntryNumber(params.journalCode);

        return this.sequelize.transaction(async (t) => {
            const entry = await this.entryModel.create({
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
                    journalEntryId: entry.id,
                    ...l,
                })),
                { transaction: t },
            );

            return entry;
        });
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

            const lines: { accountCode: string; debit: number; credit: number; label?: string }[] = [
                {
                    accountCode: '411000',
                    debit: Number(invoice.total),
                    credit: 0,
                    label: `Client - ${invoice.invoiceNumber}`,
                },
                {
                    accountCode: '706000',
                    debit: 0,
                    credit: Number(invoice.subtotal),
                    label: `Vente - ${invoice.invoiceNumber}`,
                },
            ];

            // Add TVA line if there's tax
            const taxAmount = Number(invoice.taxAmount) || 0;
            if (taxAmount > 0) {
                lines.push({
                    accountCode: '443100',
                    debit: 0,
                    credit: taxAmount,
                    label: `TVA collectée - ${invoice.invoiceNumber}`,
                });
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
     * Called when an invoice is paid (SENT → PAID)
     * Creates: Debit 521000 Banque / Credit 411000 Clients
     */
    async onInvoicePaid(invoice: any, userId: string): Promise<void> {
        try {
            const date = invoice.paidAt
                ? new Date(invoice.paidAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            await this.createAutoEntry({
                journalCode: 'BQ',
                date,
                description: `Encaissement facture ${invoice.invoiceNumber}`,
                reference: invoice.invoiceNumber,
                sourceType: 'INVOICE',
                sourceId: invoice.id,
                lines: [
                    {
                        accountCode: '521000',
                        debit: Number(invoice.total),
                        credit: 0,
                        label: `Encaissement - ${invoice.invoiceNumber}`,
                    },
                    {
                        accountCode: '411000',
                        debit: 0,
                        credit: Number(invoice.total),
                        label: `Solde client - ${invoice.invoiceNumber}`,
                    },
                ],
                userId,
            });
        } catch (error) {
            this.logger.error(`Failed to create journal entry for invoice paid: ${error.message}`);
        }
    }

    /**
     * Called when an expense is created
     * Creates: Debit 6XXXXX Charge / Credit 521000 Banque
     */
    async onExpenseCreated(expense: any, userId: string): Promise<void> {
        try {
            const category = expense.category || '';
            const accountCode = EXPENSE_CATEGORY_ACCOUNT_MAP[category] || DEFAULT_EXPENSE_ACCOUNT;
            const date = expense.date || new Date().toISOString().split('T')[0];

            await this.createAutoEntry({
                journalCode: 'BQ',
                date,
                description: `Dépense: ${expense.title}`,
                reference: expense.id,
                sourceType: 'EXPENSE',
                sourceId: expense.id,
                lines: [
                    {
                        accountCode,
                        debit: Number(expense.amount),
                        credit: 0,
                        label: expense.title,
                    },
                    {
                        accountCode: '521000',
                        debit: 0,
                        credit: Number(expense.amount),
                        label: `Paiement - ${expense.title}`,
                    },
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
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { Journal } from '../models/journal.model';
import { Account } from '../models/account.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { User } from '../models/user.model';
import { FiscalYearsService } from './fiscal-years.service';
import { CacheService } from '../cache/cache.service';
import { CACHE_PATTERNS } from '../cache/cache.keys';

@Injectable()
export class JournalEntriesService {
    constructor(
        @InjectModel(JournalEntry)
        private entryModel: typeof JournalEntry,
        @InjectModel(JournalEntryLine)
        private lineModel: typeof JournalEntryLine,
        @InjectModel(Journal)
        private journalModel: typeof Journal,
        @InjectConnection()
        private sequelize: Sequelize,
        private fiscalYearsService: FiscalYearsService,
        private cache: CacheService,
    ) {}

    async generateEntryNumber(journalCode: string): Promise<string> {
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

    async findAll(filters: { journalId?: string; fiscalYearId?: string; status?: string; sourceType?: string; from?: string; to?: string } = {}) {
        const where: any = {};
        if (filters.journalId) where.journalId = filters.journalId;
        if (filters.fiscalYearId) where.fiscalYearId = filters.fiscalYearId;
        if (filters.status) where.status = filters.status;
        if (filters.sourceType) where.sourceType = filters.sourceType;
        if (filters.from || filters.to) {
            where.date = {};
            if (filters.from) where.date[Op.gte] = filters.from;
            if (filters.to) where.date[Op.lte] = filters.to;
        }

        return this.entryModel.findAll({
            where,
            include: [
                { model: Journal, attributes: ['id', 'code', 'name'] },
                { model: FiscalYear, attributes: ['id', 'name'] },
                { model: User, as: 'createdBy', attributes: ['id', 'email'] },
                {
                    model: JournalEntryLine,
                    include: [{ model: Account, attributes: ['id', 'code', 'name'] }],
                },
            ],
            order: [['date', 'DESC'], ['entryNumber', 'DESC']],
        });
    }

    async findOne(id: string) {
        const entry = await this.entryModel.findByPk(id, {
            include: [
                { model: Journal, attributes: ['id', 'code', 'name', 'type'] },
                { model: FiscalYear, attributes: ['id', 'name', 'status'] },
                {
                    model: JournalEntryLine,
                    include: [{ model: Account, attributes: ['id', 'code', 'name', 'type'] }],
                },
                { model: User, as: 'validatedBy', attributes: ['id', 'email'] },
            ],
        });
        if (!entry) throw new NotFoundException('Journal entry not found');
        return entry;
    }

    async create(dto: any, userId: string) {
        const { journalId, date, description, reference, lines, sourceType, sourceId } = dto;

        // Validate journal exists
        const journal = await this.journalModel.findByPk(journalId);
        if (!journal) throw new NotFoundException('Journal not found');

        // Find fiscal year for the date
        const fiscalYear = await this.fiscalYearsService.findOpenYear();
        if (date < fiscalYear.startDate || date > fiscalYear.endDate) {
            throw new BadRequestException(`Date ${date} is outside the open fiscal year (${fiscalYear.startDate} - ${fiscalYear.endDate})`);
        }

        // Validate lines: debit = credit
        if (!lines || lines.length < 2) {
            throw new BadRequestException('A journal entry must have at least 2 lines');
        }

        const totalDebit = lines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
        const totalCredit = lines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new BadRequestException(
                `Debit (${totalDebit}) must equal Credit (${totalCredit}). Difference: ${Math.abs(totalDebit - totalCredit)}`,
            );
        }

        // Each line must have either debit or credit, not both
        for (const line of lines) {
            if ((Number(line.debit) || 0) > 0 && (Number(line.credit) || 0) > 0) {
                throw new BadRequestException('A line cannot have both debit and credit amounts');
            }
            if ((Number(line.debit) || 0) === 0 && (Number(line.credit) || 0) === 0) {
                throw new BadRequestException('A line must have either a debit or credit amount');
            }
        }

        const entryNumber = await this.generateEntryNumber(journal.code);

        const created = await this.sequelize.transaction(async (t) => {
            const entry = await this.entryModel.create({
                entryNumber,
                journalId,
                fiscalYearId: fiscalYear.id,
                date,
                description,
                reference,
                sourceType: sourceType || 'MANUAL',
                sourceId: sourceId || null,
                status: 'DRAFT',
                createdByUserId: userId,
                totalDebit: Math.round(totalDebit * 100) / 100,
                totalCredit: Math.round(totalCredit * 100) / 100,
            } as any, { transaction: t });

            await this.lineModel.bulkCreate(
                lines.map((l: any) => ({
                    journalEntryId: entry.id,
                    accountId: l.accountId,
                    debit: Math.round((Number(l.debit) || 0) * 100) / 100,
                    credit: Math.round((Number(l.credit) || 0) * 100) / 100,
                    label: l.label || null,
                })),
                { transaction: t },
            );

            return entry.id;
        });

        // Invalidate AFTER the transaction commits so no reader can cache stale data
        // in the window between invalidation and commit.
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS);
        return this.findOne(created);
    }

    async validate(id: string, userId: string) {
        const entry = await this.findOne(id);
        if (entry.status === 'VALIDATED') return entry;
        if (entry.status !== 'DRAFT') {
            throw new BadRequestException('Can only validate DRAFT entries');
        }

        await entry.update({
            status: 'VALIDATED',
            validatedAt: new Date(),
            validatedByUserId: userId,
        });

        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS);
        return this.findOne(id);
    }

    async remove(id: string) {
        const entry = await this.findOne(id);
        if (entry.status === 'VALIDATED') {
            throw new BadRequestException('Cannot delete a validated journal entry');
        }
        await this.sequelize.transaction(async (t) => {
            await this.lineModel.destroy({ where: { journalEntryId: id }, transaction: t });
            await entry.destroy({ transaction: t });
        });
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS);
        return { deleted: true };
    }
}

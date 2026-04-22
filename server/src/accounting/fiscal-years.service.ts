import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { FiscalYear } from '../models/fiscal-year.model';
import { User } from '../models/user.model';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL, CACHE_PATTERNS } from '../cache/cache.keys';

@Injectable()
export class FiscalYearsService {
    constructor(
        @InjectModel(FiscalYear)
        private fiscalYearModel: typeof FiscalYear,
        private cache: CacheService,
    ) {}

    async findAll() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.FISCAL_YEARS);
        if (cached) return cached;

        const rows = await this.fiscalYearModel.findAll({
            include: [{ model: User, as: 'closedBy', attributes: ['id', 'email'] }],
            order: [['startDate', 'DESC']],
        });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.FISCAL_YEARS, result, CACHE_TTL.FISCAL_YEAR);
        return result;
    }

    async findOne(id: string) {
        const fy = await this.fiscalYearModel.findByPk(id, {
            include: [{ model: User, as: 'closedBy', attributes: ['id', 'email'] }],
        });
        if (!fy) throw new NotFoundException('Fiscal year not found');
        return fy;
    }

    async findOpenYear() {
        const cached = await this.cache.get<any>(CACHE_KEYS.FISCAL_YEARS_OPEN);
        if (cached) return cached;

        const fy = await this.fiscalYearModel.findOne({ where: { status: 'OPEN' } });
        if (!fy) throw new NotFoundException('No open fiscal year found. Please create one.');
        const result = fy.get({ plain: true });
        await this.cache.set(CACHE_KEYS.FISCAL_YEARS_OPEN, result, CACHE_TTL.FISCAL_YEAR);
        return result;
    }

    async findYearForDate(date: string) {
        const fy = await this.fiscalYearModel.findOne({
            where: {
                startDate: { [Op.lte]: date },
                endDate: { [Op.gte]: date },
                status: 'OPEN',
            },
        });
        return fy;
    }

    async create(dto: any) {
        const overlapping = await this.fiscalYearModel.findOne({
            where: {
                [Op.or]: [
                    { startDate: { [Op.between]: [dto.startDate, dto.endDate] } },
                    { endDate: { [Op.between]: [dto.startDate, dto.endDate] } },
                ],
            },
        });
        if (overlapping) {
            throw new ConflictException('A fiscal year already exists for this period');
        }
        const result = await this.fiscalYearModel.create(dto);
        await this.cache.invalidateByPattern(CACHE_PATTERNS.FISCAL_YEARS);
        return result;
    }

    async close(id: string, userId: string) {
        const fy = await this.findOne(id);
        if (fy.status === 'CLOSED') {
            throw new BadRequestException('Fiscal year is already closed');
        }
        await fy.update({ status: 'CLOSED', closedAt: new Date(), closedByUserId: userId });
        // Closing a fiscal year invalidates reports and the open year cache
        await this.cache.invalidateByPattern(CACHE_PATTERNS.FISCAL_YEARS);
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS);
        return this.findOne(id);
    }

    async reopen(id: string) {
        const fy = await this.findOne(id);
        if (fy.status === 'OPEN') {
            throw new BadRequestException('Fiscal year is already open');
        }
        await fy.update({ status: 'OPEN', closedAt: null, closedByUserId: null });
        await this.cache.invalidateByPattern(CACHE_PATTERNS.FISCAL_YEARS);
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTING_REPORTS);
        return this.findOne(id);
    }
}

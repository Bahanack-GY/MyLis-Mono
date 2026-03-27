import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { FiscalYear } from '../models/fiscal-year.model';
import { User } from '../models/user.model';

@Injectable()
export class FiscalYearsService {
    constructor(
        @InjectModel(FiscalYear)
        private fiscalYearModel: typeof FiscalYear,
    ) {}

    async findAll() {
        return this.fiscalYearModel.findAll({
            include: [{ model: User, as: 'closedBy', attributes: ['id', 'email'] }],
            order: [['startDate', 'DESC']],
        });
    }

    async findOne(id: string) {
        const fy = await this.fiscalYearModel.findByPk(id, {
            include: [{ model: User, as: 'closedBy', attributes: ['id', 'email'] }],
        });
        if (!fy) throw new NotFoundException('Fiscal year not found');
        return fy;
    }

    async findOpenYear() {
        const fy = await this.fiscalYearModel.findOne({ where: { status: 'OPEN' } });
        if (!fy) throw new NotFoundException('No open fiscal year found. Please create one.');
        return fy;
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
        // Check for overlapping fiscal years
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
        return this.fiscalYearModel.create(dto);
    }

    async close(id: string, userId: string) {
        const fy = await this.findOne(id);
        if (fy.status === 'CLOSED') {
            throw new BadRequestException('Fiscal year is already closed');
        }
        await fy.update({
            status: 'CLOSED',
            closedAt: new Date(),
            closedByUserId: userId,
        });
        return this.findOne(id);
    }

    async reopen(id: string) {
        const fy = await this.findOne(id);
        if (fy.status === 'OPEN') {
            throw new BadRequestException('Fiscal year is already open');
        }
        await fy.update({
            status: 'OPEN',
            closedAt: null,
            closedByUserId: null,
        });
        return this.findOne(id);
    }
}

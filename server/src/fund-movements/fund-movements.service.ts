import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FundMovement } from '../models/fund-movement.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { JournalEngineService } from '../accounting/journal-engine.service';

@Injectable()
export class FundMovementsService {
    constructor(
        @InjectModel(FundMovement)
        private fundMovementModel: typeof FundMovement,
        private journalEngine: JournalEngineService,
    ) {}

    private get includeOptions() {
        return [
            {
                model: User,
                as: 'ceoUser',
                attributes: ['id', 'email', 'role'],
                include: [
                    { model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] },
                ],
            },
            {
                model: User,
                as: 'createdByUser',
                attributes: ['id', 'email', 'role'],
                include: [
                    { model: Employee, as: 'employee', attributes: ['firstName', 'lastName'] },
                ],
            },
        ];
    }

    async create(
        dto: { type: 'APPORT' | 'RETRAIT'; amount: number; description: string; date: string; ceoUserId: string },
        createdByUserId: string,
    ): Promise<FundMovement> {
        const movement = await this.fundMovementModel.create({
            ...dto,
            createdByUserId,
        } as any);

        const entryRef = await this.journalEngine.onFundMovement(movement, createdByUserId);
        if (entryRef) {
            await movement.update({ journalEntryRef: entryRef });
        }

        return this.findOne(movement.id);
    }

    async findAll(
        params: { page?: number; limit?: number; type?: string; ceoUserId?: string } = {},
    ): Promise<{ rows: FundMovement[]; count: number; stats: any }> {
        const { page = 1, limit = 20, type, ceoUserId } = params;
        const where: any = {};
        if (type) where.type = type;
        if (ceoUserId) where.ceoUserId = ceoUserId;

        const { rows, count } = await this.fundMovementModel.findAndCountAll({
            where,
            include: this.includeOptions,
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
            distinct: true,
        });

        // Compute stats
        const allForStats = await this.fundMovementModel.findAll({
            where: ceoUserId ? { ceoUserId } : {},
        });
        const totalApport = allForStats
            .filter(m => m.type === 'APPORT')
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalRetrait = allForStats
            .filter(m => m.type === 'RETRAIT')
            .reduce((s, m) => s + Number(m.amount), 0);

        return {
            rows,
            count,
            stats: {
                totalApport,
                totalRetrait,
                solde: totalApport - totalRetrait,
                count: allForStats.length,
            },
        };
    }

    async findOne(id: string): Promise<FundMovement> {
        const movement = await this.fundMovementModel.findByPk(id, {
            include: this.includeOptions,
        });
        if (!movement) throw new NotFoundException('Fund movement not found');
        return movement;
    }

    async remove(id: string): Promise<{ success: boolean }> {
        const movement = await this.findOne(id);
        await this.journalEngine.onFundMovementDeleted(id);
        await movement.destroy();
        return { success: true };
    }
}

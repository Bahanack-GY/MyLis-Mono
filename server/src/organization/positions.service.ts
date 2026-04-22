
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Position } from '../models/position.model';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys';

@Injectable()
export class PositionsService {
    constructor(
        @InjectModel(Position)
        private positionModel: typeof Position,
        private cache: CacheService,
    ) { }

    async create(createPositionDto: any) {
        const result = await this.positionModel.create(createPositionDto);
        await this.cache.del(CACHE_KEYS.POSITIONS);
        return result;
    }

    async findAll() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.POSITIONS);
        if (cached) return cached;

        const rows = await this.positionModel.findAll();
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.POSITIONS, result, CACHE_TTL.REFERENCE);
        return result;
    }

    findOne(id: string) {
        return this.positionModel.findByPk(id);
    }

    async update(id: string, dto: any) {
        const pos = await this.positionModel.findByPk(id);
        if (!pos) return null;
        await pos.update(dto);
        await this.cache.del(CACHE_KEYS.POSITIONS);
        return pos;
    }

    async remove(id: string) {
        const pos = await this.positionModel.findByPk(id);
        if (pos) {
            await pos.destroy();
            await this.cache.del(CACHE_KEYS.POSITIONS);
        }
    }
}

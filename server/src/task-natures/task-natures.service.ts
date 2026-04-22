import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TaskNature } from '../models/task-nature.model';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys';

@Injectable()
export class TaskNaturesService {
    constructor(
        @InjectModel(TaskNature)
        private taskNatureModel: typeof TaskNature,
        private cache: CacheService,
    ) {}

    async create(dto: any) {
        const result = await this.taskNatureModel.create(dto);
        await this.cache.del(CACHE_KEYS.TASK_NATURES);
        return result;
    }

    async findAll() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.TASK_NATURES);
        if (cached) return cached;

        const rows = await this.taskNatureModel.findAll({ order: [['name', 'ASC']] });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.TASK_NATURES, result, CACHE_TTL.REFERENCE);
        return result;
    }

    findOne(id: string) {
        return this.taskNatureModel.findByPk(id);
    }

    async update(id: string, dto: any) {
        const nature = await this.taskNatureModel.findByPk(id);
        if (!nature) return null;
        await nature.update(dto);
        await this.cache.del(CACHE_KEYS.TASK_NATURES);
        return nature;
    }

    async remove(id: string) {
        const nature = await this.taskNatureModel.findByPk(id);
        if (nature) {
            await nature.destroy();
            await this.cache.del(CACHE_KEYS.TASK_NATURES);
        }
    }
}

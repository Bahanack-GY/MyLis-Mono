import { Injectable, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ChargeNatureConfig } from '../models/charge-nature-config.model';
import { CHARGE_FAMILIES, DEFAULT_CHARGE_NATURES } from '../accounting/syscohada-seed';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys';

@Injectable()
export class ChargeNaturesService implements OnModuleInit {
    constructor(
        @InjectModel(ChargeNatureConfig)
        private model: typeof ChargeNatureConfig,
        private cache: CacheService,
    ) {}

    async onModuleInit() {
        await this.seedDefaultNatures();
    }

    private async seedDefaultNatures() {
        for (const n of DEFAULT_CHARGE_NATURES) {
            const existing = await this.model.findOne({
                where: { chargeFamily: n.chargeFamily, natureName: n.natureName },
            });
            if (!existing) {
                await this.model.create({ ...n, isSystem: true } as any);
            }
        }
    }

    getFamilies() {
        return CHARGE_FAMILIES;
    }

    async findAll(chargeFamily?: string) {
        const key = CACHE_KEYS.CHARGE_NATURES(chargeFamily);
        const cached = await this.cache.get<any[]>(key);
        if (cached) return cached;

        const where: any = {};
        if (chargeFamily) where.chargeFamily = chargeFamily;
        const rows = await this.model.findAll({
            where,
            order: [['chargeFamily', 'ASC'], ['sortOrder', 'ASC'], ['natureName', 'ASC']],
        });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(key, result, CACHE_TTL.REFERENCE);
        return result;
    }

    async findOne(id: string) {
        const item = await this.model.findByPk(id);
        if (!item) throw new NotFoundException('Nature de charge introuvable');
        return item;
    }

    async create(dto: { chargeFamily: string; natureName: string; syscohadaAccount: string }) {
        const validFamilies = CHARGE_FAMILIES.map(f => f.code);
        if (!validFamilies.includes(dto.chargeFamily)) {
            throw new BadRequestException('Famille de charge invalide');
        }
        const existing = await this.model.findOne({
            where: { chargeFamily: dto.chargeFamily, natureName: dto.natureName },
        });
        if (existing) throw new BadRequestException('Cette nature de charge existe déjà');
        const maxOrder = await this.model.max<number, ChargeNatureConfig>('sortOrder', {
            where: { chargeFamily: dto.chargeFamily },
        }) as number || 0;
        const result = await this.model.create({ ...dto, isSystem: false, sortOrder: maxOrder + 1 } as any);
        // Invalidate both the family-specific and the full-list keys
        await Promise.all([
            this.cache.del(CACHE_KEYS.CHARGE_NATURES(dto.chargeFamily)),
            this.cache.del(CACHE_KEYS.CHARGE_NATURES()),
        ]);
        return result;
    }

    async update(id: string, dto: { natureName?: string; syscohadaAccount?: string }) {
        const item = await this.findOne(id);
        const result = await item.update(dto);
        await Promise.all([
            this.cache.del(CACHE_KEYS.CHARGE_NATURES(item.chargeFamily)),
            this.cache.del(CACHE_KEYS.CHARGE_NATURES()),
        ]);
        return result;
    }

    async remove(id: string) {
        const item = await this.findOne(id);
        if (item.isSystem) throw new BadRequestException('Les natures système ne peuvent pas être supprimées');
        const family = item.chargeFamily;
        await item.destroy();
        await Promise.all([
            this.cache.del(CACHE_KEYS.CHARGE_NATURES(family)),
            this.cache.del(CACHE_KEYS.CHARGE_NATURES()),
        ]);
        return { success: true };
    }
}

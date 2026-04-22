import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TaxConfig } from '../models/tax-config.model';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys';

@Injectable()
export class TaxConfigService {
    constructor(
        @InjectModel(TaxConfig)
        private taxConfigModel: typeof TaxConfig,
        private cache: CacheService,
    ) {}

    async findAll() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.TAX_CONFIG);
        if (cached) return cached;

        const rows = await this.taxConfigModel.findAll({ order: [['key', 'ASC']] });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.TAX_CONFIG, result, CACHE_TTL.REFERENCE_LONG);
        return result;
    }

    async findByKey(key: string) {
        const config = await this.taxConfigModel.findOne({ where: { key } });
        if (!config) throw new NotFoundException(`Tax config '${key}' not found`);
        return config;
    }

    async upsert(dto: any) {
        const [config] = await this.taxConfigModel.upsert(dto as any);
        await this.cache.del(CACHE_KEYS.TAX_CONFIG);
        return config;
    }

    async seed() {
        const existing = await this.taxConfigModel.count();
        if (existing > 0) return { message: 'Already seeded', count: existing };

        const configs = [
            { key: 'TVA_RATE', value: 0.1925, label: 'TVA (taux effectif)', effectiveFrom: '2024-01-01' },
            { key: 'TVA_BASE_RATE', value: 0.175, label: 'TVA (taux de base)', effectiveFrom: '2024-01-01' },
            { key: 'IS_STANDARD_RATE', value: 0.30, label: 'IS (taux standard)', effectiveFrom: '2024-01-01' },
            { key: 'IS_SME_RATE', value: 0.28, label: 'IS (PME < 3Mds)', effectiveFrom: '2024-01-01' },
            { key: 'IS_MINIMUM_RATE', value: 0.01, label: 'IS minimum (1% du CA)', effectiveFrom: '2024-01-01' },
            { key: 'CNPS_EMPLOYEE_RATE', value: 0.028, label: 'CNPS salariale', effectiveFrom: '2024-01-01' },
            { key: 'CNPS_EMPLOYER_RATE', value: 0.112, label: 'CNPS patronale', effectiveFrom: '2024-01-01' },
            { key: 'CNPS_CEILING', value: 750000, label: 'Plafond CNPS mensuel', effectiveFrom: '2024-01-01' },
            { key: 'CFC_RATE', value: 0.01, label: 'CFC (Crédit Foncier)', effectiveFrom: '2024-01-01' },
            { key: 'COMMUNAL_TAX_RATE', value: 0.10, label: 'Centimes communaux (10% IRPP)', effectiveFrom: '2024-01-01' },
        ];

        await this.taxConfigModel.bulkCreate(configs as any[]);
        await this.cache.del(CACHE_KEYS.TAX_CONFIG);
        return { message: 'Tax configs seeded', count: configs.length };
    }
}

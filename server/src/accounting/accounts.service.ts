import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Account } from '../models/account.model';
import { AccountCategory } from '../models/account-category.model';
import { Journal } from '../models/journal.model';
import { Department } from '../models/department.model';
import { SEED_CATEGORIES, SEED_ACCOUNTS, SEED_JOURNALS } from './syscohada-seed';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL, CACHE_PATTERNS } from '../cache/cache.keys';

@Injectable()
export class AccountsService {
    constructor(
        @InjectModel(Account)
        private accountModel: typeof Account,
        @InjectModel(AccountCategory)
        private categoryModel: typeof AccountCategory,
        @InjectModel(Journal)
        private journalModel: typeof Journal,
        @InjectModel(Department)
        private departmentModel: typeof Department,
        private cache: CacheService,
    ) {}

    // ===== CHART OF ACCOUNTS =====

    async findAll() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.ACCOUNTS_LIST);
        if (cached) return cached;

        const rows = await this.accountModel.findAll({
            include: [
                { model: AccountCategory, attributes: ['id', 'code', 'name'] },
                { model: Department, attributes: ['id', 'name'], required: false },
            ],
            order: [['code', 'ASC']],
        });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.ACCOUNTS_LIST, result, CACHE_TTL.REFERENCE_LONG);
        return result;
    }

    async findTree() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.ACCOUNTS_TREE);
        if (cached) return cached;

        const accounts = await this.accountModel.findAll({
            include: [
                { model: AccountCategory, attributes: ['id', 'code', 'name'] },
                { model: Department, attributes: ['id', 'name'], required: false },
            ],
            order: [['code', 'ASC']],
        });
        const categories = await this.categoryModel.findAll({ order: [['code', 'ASC']] });

        const tree = categories.map(cat => {
            const catAccounts = accounts.filter(a => a.categoryId === cat.id);
            const rootAccounts = catAccounts.filter(a => !a.parentId);
            const buildChildren = (parentId: string): any[] => {
                return catAccounts
                    .filter(a => a.parentId === parentId)
                    .map(a => ({
                        ...a.get({ plain: true }),
                        children: buildChildren(a.id),
                    }));
            };
            return {
                ...cat.get({ plain: true }),
                accounts: rootAccounts.map(a => ({
                    ...a.get({ plain: true }),
                    children: buildChildren(a.id),
                })),
            };
        });

        await this.cache.set(CACHE_KEYS.ACCOUNTS_TREE, tree, CACHE_TTL.REFERENCE_LONG);
        return tree;
    }

    async findOne(id: string) {
        const account = await this.accountModel.findByPk(id, {
            include: [AccountCategory],
        });
        if (!account) throw new NotFoundException('Account not found');
        return account;
    }

    async findByCode(code: string) {
        const account = await this.accountModel.findOne({ where: { code } });
        if (!account) throw new NotFoundException(`Account with code ${code} not found`);
        return account;
    }

    async create(dto: any) {
        const existing = await this.accountModel.findOne({ where: { code: dto.code } });
        if (existing) throw new ConflictException(`Account with code ${dto.code} already exists`);
        const result = await this.accountModel.create(dto);
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTS);
        return result;
    }

    async update(id: string, dto: any) {
        const account = await this.findOne(id);
        if (account.isSystem) {
            throw new BadRequestException('Cannot modify a system account');
        }
        const result = await account.update(dto);
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTS);
        return result;
    }

    async remove(id: string) {
        const account = await this.findOne(id);
        if (account.isSystem) {
            throw new BadRequestException('Cannot delete a system account');
        }
        await account.destroy();
        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTS);
        return { deleted: true };
    }

    // ===== AUXILIARY ACCOUNTS (double-indexation) =====

    /**
     * Create a nominative auxiliary account under a collective parent.
     * Auto-generates code: parent.code + 3-digit sequence (e.g. 411000 → 411000001).
     */
    async createAuxiliary(params: {
        collectiveCode: string;
        thirdPartyType: 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE';
        thirdPartyId: string;
        name: string;
    }): Promise<Account> {
        const collective = await this.accountModel.findOne({ where: { code: params.collectiveCode } });
        if (!collective) throw new NotFoundException(`Collective account ${params.collectiveCode} not found`);

        // Check if auxiliary already exists for this third party
        const existing = await this.accountModel.findOne({
            where: {
                parentId: collective.id,
                thirdPartyType: params.thirdPartyType,
                thirdPartyId: params.thirdPartyId,
            },
        });
        if (existing) return existing;

        // Count existing children to determine next sequence
        const childCount = await this.accountModel.count({ where: { parentId: collective.id } });
        const seq = String(childCount + 1).padStart(3, '0');
        const code = `${collective.code}${seq}`;

        const auxiliary = await this.accountModel.create({
            code,
            name: params.name,
            type: collective.type,
            categoryId: collective.categoryId,
            parentId: collective.id,
            isCollective: false,
            thirdPartyType: params.thirdPartyType,
            thirdPartyId: params.thirdPartyId,
            isSystem: false,
            isActive: true,
        } as any);

        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTS);
        return auxiliary;
    }

    /**
     * Resolve (or auto-create) the auxiliary account for a third party under a collective.
     */
    async resolveAuxiliary(params: {
        collectiveCode: string;
        thirdPartyType: 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE';
        thirdPartyId: string;
        name: string;
    }): Promise<Account | null> {
        const collective = await this.accountModel.findOne({ where: { code: params.collectiveCode } });
        if (!collective) return null;

        const existing = await this.accountModel.findOne({
            where: {
                parentId: collective.id,
                thirdPartyType: params.thirdPartyType,
                thirdPartyId: params.thirdPartyId,
            },
        });
        if (existing) return existing;

        return this.createAuxiliary(params);
    }

    /**
     * List all auxiliary accounts under a collective (drill-down).
     */
    async listAuxiliaries(collectiveId: string): Promise<Account[]> {
        return this.accountModel.findAll({
            where: { parentId: collectiveId, isCollective: false },
            order: [['code', 'ASC']],
        });
    }

    /**
     * Find auxiliary account by third-party ID.
     */
    async findByThirdParty(thirdPartyType: string, thirdPartyId: string): Promise<Account | null> {
        return this.accountModel.findOne({
            where: { thirdPartyType, thirdPartyId },
        });
    }

    // ===== CATEGORIES =====

    async findAllCategories() {
        return this.categoryModel.findAll({ order: [['code', 'ASC']] });
    }

    // ===== JOURNALS =====

    async findAllJournals() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.JOURNALS);
        if (cached) return cached;

        const rows = await this.journalModel.findAll({ order: [['code', 'ASC']] });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.JOURNALS, result, CACHE_TTL.REFERENCE);
        return result;
    }

    async findJournalByCode(code: string) {
        const journal = await this.journalModel.findOne({ where: { code } });
        if (!journal) throw new NotFoundException(`Journal with code ${code} not found`);
        return journal;
    }

    async createJournal(dto: any) {
        const existing = await this.journalModel.findOne({ where: { code: dto.code } });
        if (existing) throw new ConflictException(`Journal with code ${dto.code} already exists`);
        const result = await this.journalModel.create(dto);
        await this.cache.del(CACHE_KEYS.JOURNALS);
        return result;
    }

    async updateJournal(id: string, dto: any) {
        const journal = await this.journalModel.findByPk(id);
        if (!journal) throw new NotFoundException('Journal not found');
        const result = await journal.update(dto);
        await this.cache.del(CACHE_KEYS.JOURNALS);
        return result;
    }

    // ===== SEED =====

    async seed() {
        // 1. Upsert categories (idempotent)
        const categoryMap = new Map<string, string>();
        for (const cat of SEED_CATEGORIES) {
            const [record] = await this.categoryModel.findOrCreate({
                where: { code: cat.code } as any,
                defaults: cat as any,
            });
            categoryMap.set(cat.code, record.id);
        }

        // 2. Upsert accounts — first pass without parentId
        const accountMap = new Map<string, string>();
        for (const acc of SEED_ACCOUNTS) {
            const [record] = await this.accountModel.findOrCreate({
                where: { code: acc.code } as any,
                defaults: {
                    code: acc.code,
                    name: acc.name,
                    type: acc.type,
                    categoryId: categoryMap.get(acc.categoryCode),
                    isCollective: acc.isCollective ?? false,
                    isSystem: true,
                    isActive: true,
                } as any,
            });
            accountMap.set(acc.code, record.id);
        }

        // Second pass: set parent references
        for (const acc of SEED_ACCOUNTS) {
            if (acc.parentCode) {
                const parentId = accountMap.get(acc.parentCode);
                const accountId = accountMap.get(acc.code);
                if (parentId && accountId) {
                    await this.accountModel.update(
                        { parentId },
                        { where: { id: accountId } },
                    );
                }
            }
        }

        // 3. Upsert journals
        for (const journal of SEED_JOURNALS) {
            await this.journalModel.findOrCreate({
                where: { code: journal.code } as any,
                defaults: journal as any,
            });
        }

        await this.cache.invalidateByPattern(CACHE_PATTERNS.ACCOUNTS);
        await this.cache.del(CACHE_KEYS.JOURNALS);

        return {
            message: 'SYSCOHADA chart of accounts seeded (idempotent)',
            categories: SEED_CATEGORIES.length,
            accounts: SEED_ACCOUNTS.length,
            journals: SEED_JOURNALS.length,
        };
    }
}

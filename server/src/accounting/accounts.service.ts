import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Account } from '../models/account.model';
import { AccountCategory } from '../models/account-category.model';
import { Journal } from '../models/journal.model';
import { Department } from '../models/department.model';
import { SEED_CATEGORIES, SEED_ACCOUNTS, SEED_JOURNALS } from './syscohada-seed';

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
    ) {}

    // ===== CHART OF ACCOUNTS =====

    async findAll() {
        return this.accountModel.findAll({
            include: [
                { model: AccountCategory, attributes: ['id', 'code', 'name'] },
                { model: Department, attributes: ['id', 'name'], required: false },
            ],
            order: [['code', 'ASC']],
        });
    }

    async findTree() {
        const accounts = await this.accountModel.findAll({
            include: [
                { model: AccountCategory, attributes: ['id', 'code', 'name'] },
                { model: Department, attributes: ['id', 'name'], required: false },
            ],
            order: [['code', 'ASC']],
        });
        const categories = await this.categoryModel.findAll({ order: [['code', 'ASC']] });

        // Group accounts by category
        const tree = categories.map(cat => {
            const catAccounts = accounts.filter(a => a.categoryId === cat.id);
            // Build hierarchical tree within each category
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
        return this.accountModel.create(dto);
    }

    async update(id: string, dto: any) {
        const account = await this.findOne(id);
        if (account.isSystem) {
            throw new BadRequestException('Cannot modify a system account');
        }
        return account.update(dto);
    }

    async remove(id: string) {
        const account = await this.findOne(id);
        if (account.isSystem) {
            throw new BadRequestException('Cannot delete a system account');
        }
        await account.destroy();
        return { deleted: true };
    }

    // ===== CATEGORIES =====

    async findAllCategories() {
        return this.categoryModel.findAll({ order: [['code', 'ASC']] });
    }

    // ===== JOURNALS =====

    async findAllJournals() {
        return this.journalModel.findAll({ order: [['code', 'ASC']] });
    }

    async findJournalByCode(code: string) {
        const journal = await this.journalModel.findOne({ where: { code } });
        if (!journal) throw new NotFoundException(`Journal with code ${code} not found`);
        return journal;
    }

    async createJournal(dto: any) {
        const existing = await this.journalModel.findOne({ where: { code: dto.code } });
        if (existing) throw new ConflictException(`Journal with code ${dto.code} already exists`);
        return this.journalModel.create(dto);
    }

    async updateJournal(id: string, dto: any) {
        const journal = await this.journalModel.findByPk(id);
        if (!journal) throw new NotFoundException('Journal not found');
        return journal.update(dto);
    }

    // ===== SEED =====

    async seed() {
        // Check if already seeded
        const existingCategories = await this.categoryModel.count();
        if (existingCategories > 0) {
            return { message: 'Already seeded', categories: existingCategories };
        }

        // 1. Create categories
        const categoryMap = new Map<string, string>();
        for (const cat of SEED_CATEGORIES) {
            const created = await this.categoryModel.create(cat as any);
            categoryMap.set(cat.code, created.id);
        }

        // 2. Create accounts (two passes: first without parents, then update parent references)
        const accountMap = new Map<string, string>();
        // First pass: create all accounts without parentId
        for (const acc of SEED_ACCOUNTS) {
            const created = await this.accountModel.create({
                code: acc.code,
                name: acc.name,
                type: acc.type,
                categoryId: categoryMap.get(acc.categoryCode),
                isSystem: true,
                isActive: true,
            } as any);
            accountMap.set(acc.code, created.id);
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

        // 3. Create journals
        for (const journal of SEED_JOURNALS) {
            await this.journalModel.create(journal as any);
        }

        return {
            message: 'SYSCOHADA chart of accounts seeded successfully',
            categories: SEED_CATEGORIES.length,
            accounts: SEED_ACCOUNTS.length,
            journals: SEED_JOURNALS.length,
        };
    }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ExpensesService } from './expenses.service';
import { Expense } from '../models/expense.model';
import { Project } from '../models/project.model';
import { NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';

describe('ExpensesService', () => {
    let service: ExpensesService;

    const mockExpenseModel = {
        create: jest.fn(),
        findAndCountAll: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
    };

    const mockProjectModel = {
        findAll: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExpensesService,
                { provide: getModelToken(Expense), useValue: mockExpenseModel },
                { provide: getModelToken(Project), useValue: mockProjectModel },
            ],
        }).compile();

        service = module.get<ExpensesService>(ExpensesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create an expense', async () => {
            const dto = { amount: 100 };
            mockExpenseModel.create.mockResolvedValue({ id: '1', ...dto });
            const result = await service.create(dto);
            expect(result).toEqual({ id: '1', amount: 100 });
            expect(mockExpenseModel.create).toHaveBeenCalledWith(dto);
        });
    });

    describe('findAll', () => {
        it('should return paginated expenses', async () => {
            mockExpenseModel.findAndCountAll.mockResolvedValue({ count: 20, rows: [{ id: '1' }] });
            const result = await service.findAll('p1', 2, 5);
            expect(result).toEqual({
                data: [{ id: '1' }],
                total: 20,
                page: 2,
                totalPages: 4,
            });
            expect(mockExpenseModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { projectId: 'p1' },
                limit: 5,
                offset: 5,
            }));
        });
    });

    describe('findOne', () => {
        it('should throw if not found', async () => {
            mockExpenseModel.findByPk.mockResolvedValue(null);
            await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
        });

        it('should return expense', async () => {
            mockExpenseModel.findByPk.mockResolvedValue({ id: '1' });
            const result = await service.findOne('1');
            expect(result).toEqual({ id: '1' });
        });
    });

    describe('update', () => {
        it('should update expense', async () => {
            const expense = { update: jest.fn().mockResolvedValue({ id: '1', amount: 200 }) };
            jest.spyOn(service, 'findOne').mockResolvedValue(expense as any);
            const result = await service.update('1', { amount: 200 });
            expect(result).toEqual({ id: '1', amount: 200 });
            expect(expense.update).toHaveBeenCalledWith({ amount: 200 });
        });
    });

    describe('remove', () => {
        it('should remove expense', async () => {
            const expense = { destroy: jest.fn().mockResolvedValue(undefined) };
            jest.spyOn(service, 'findOne').mockResolvedValue(expense as any);
            const result = await service.remove('1');
            expect(result).toEqual({ success: true });
            expect(expense.destroy).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should calculate and return stats', async () => {
            mockExpenseModel.findAll.mockResolvedValue([
                { category: 'Salaire', amount: 100, type: 'RECURRENT', date: '2023-01-15' },
                { category: 'Achat', amount: 50, type: 'ONE_TIME', date: '2023-02-10' },
            ]);

            mockProjectModel.findAll.mockResolvedValue([
                { budget: 1200, startDate: '2023-01-01', endDate: '2023-12-31' },
                { budget: 600, startDate: '2022-07-01', endDate: '2023-06-30' },
            ]);

            const result = await service.getStats(2023);

            expect(result).toHaveProperty('totalYear', 150);
            expect(result).toHaveProperty('totalCount', 2);
            expect(result).toHaveProperty('recurrentCount', 1);
            expect(result).toHaveProperty('totalSalaries', 100);
            expect(result).toHaveProperty('totalProjects');
            expect(result.byCategory).toHaveLength(2);
            expect(result.byMonth).toHaveLength(12);
            expect(result.series).toEqual(['Salaires', 'Projets', 'Salaire', 'Achat']);

            expect(mockExpenseModel.findAll).toHaveBeenCalledWith({
                where: {
                    date: {
                        [Op.between]: ['2023-01-01', '2023-12-31'],
                    },
                },
            });
        });

        it('should calculate correctly if overlapping projects are partially inside year', async () => {
            mockExpenseModel.findAll.mockResolvedValue([]);

            mockProjectModel.findAll.mockResolvedValue([
                { budget: 120, startDate: '2022-12-01', endDate: '2023-01-31' }, // 2 months -> 60/mo -> 60 in current year
                { budget: 240, startDate: '2023-11-01', endDate: '2024-02-29' }, // 4 months -> 60/mo -> 120 in current year
            ]);

            const result = await service.getStats(2023);
            expect(result.totalProjects).toBe(180);
        });
    });
});

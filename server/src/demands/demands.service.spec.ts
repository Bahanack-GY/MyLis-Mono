import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DemandsService } from './demands.service';
import { Demand } from '../models/demand.model';
import { DemandItem } from '../models/demand-item.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Sequelize } from 'sequelize-typescript';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpensesService } from '../expenses/expenses.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DemandsService', () => {
    let service: DemandsService;

    const mockDemandModel = {
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
    };

    const mockDemandItemModel = {
        bulkCreate: jest.fn(),
    };

    const mockEmployeeModel = {
        findOne: jest.fn(),
    };

    const mockUserModel = {
        findAll: jest.fn(),
    };

    const mockSequelize = {
        transaction: jest.fn((callback) => callback({})),
    };

    const mockNotificationsService = {
        createMany: jest.fn(),
    };

    const mockExpensesService = {
        create: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DemandsService,
                { provide: getModelToken(Demand), useValue: mockDemandModel },
                { provide: getModelToken(DemandItem), useValue: mockDemandItemModel },
                { provide: getModelToken(Employee), useValue: mockEmployeeModel },
                { provide: getModelToken(User), useValue: mockUserModel },
                { provide: Sequelize, useValue: mockSequelize },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: ExpensesService, useValue: mockExpensesService },
            ],
        }).compile();

        service = module.get<DemandsService>(DemandsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should throw if employee not found', async () => {
            mockEmployeeModel.findOne.mockResolvedValue(null);
            await expect(service.create({}, 'u1')).rejects.toThrow(NotFoundException);
        });

        it('should create demand, items, notify managers, and return demand', async () => {
            const employee = { getDataValue: (k) => ({ id: 'e1', departmentId: 'd1', firstName: 'John', lastName: 'Doe' }[k]) };
            mockEmployeeModel.findOne.mockResolvedValue(employee);

            const dto = { items: [{ name: 'Pen', quantity: 2, unitPrice: 10 }] };
            const mDemand = { getDataValue: (k) => 'd1' };
            mockDemandModel.create.mockResolvedValue(mDemand);
            mockUserModel.findAll.mockResolvedValue([{ getDataValue: () => 'm1' }]);

            jest.spyOn(service, 'findOne').mockResolvedValue('final-demand' as any);

            const result = await service.create(dto, 'u1');

            expect(mockDemandModel.create).toHaveBeenCalled();
            expect(mockDemandItemModel.bulkCreate).toHaveBeenCalled();
            expect(mockNotificationsService.createMany).toHaveBeenCalled();
            expect(result).toBe('final-demand');
        });
    });

    describe('findAll', () => {
        it('should return all demands with filter', async () => {
            mockDemandModel.findAll.mockResolvedValue(['d1']);
            const result = await service.findAll('dept1');

            expect(mockDemandModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { departmentId: 'dept1' } }));
            expect(result).toEqual(['d1']);
        });
    });

    describe('findByEmployee', () => {
        it('should return empty array if no employee', async () => {
            mockEmployeeModel.findOne.mockResolvedValue(null);
            const result = await service.findByEmployee('u1');
            expect(result).toEqual([]);
        });

        it('should return demands if employee exists', async () => {
            mockEmployeeModel.findOne.mockResolvedValue({ getDataValue: () => 'e1' });
            mockDemandModel.findAll.mockResolvedValue(['d1']);
            const result = await service.findByEmployee('u1');
            expect(result).toEqual(['d1']);
        });
    });

    describe('findOne', () => {
        it('should throw if not found', async () => {
            mockDemandModel.findByPk.mockResolvedValue(null);
            await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
        });
    });

    describe('validate', () => {
        it('should return demand if already VALIDATED', async () => {
            const demand = { getDataValue: () => 'VALIDATED' };
            jest.spyOn(service, 'findOne').mockResolvedValue(demand as any);
            const result = await service.validate('1');
            expect(result).toBe(demand);
        });

        it('should throw if not PENDING', async () => {
            const demand = { getDataValue: () => 'REJECTED' };
            jest.spyOn(service, 'findOne').mockResolvedValue(demand as any);
            await expect(service.validate('1')).rejects.toThrow(BadRequestException);
        });

        it('should validate, notify, create expense, and return updated demand', async () => {
            const demand = {
                getDataValue: (k) => ({ status: 'PENDING', totalPrice: 100 })[k],
                employee: { userId: 'u1', firstName: 'John', lastName: 'Doe' }
            };
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce(demand as any)
                .mockResolvedValueOnce({ id: 'updated' } as any);

            const result = await service.validate('1');

            expect(mockDemandModel.update).toHaveBeenCalled();
            expect(mockNotificationsService.createMany).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ userId: 'u1' })]));
            expect(mockExpensesService.create).toHaveBeenCalled();
            expect(result).toEqual({ id: 'updated' });
        });
    });

    describe('reject', () => {
        it('should return demand if already REJECTED', async () => {
            const demand = { getDataValue: () => 'REJECTED' };
            jest.spyOn(service, 'findOne').mockResolvedValue(demand as any);
            const result = await service.reject('1');
            expect(result).toBe(demand);
        });

        it('should throw if not PENDING', async () => {
            const demand = { getDataValue: () => 'VALIDATED' };
            jest.spyOn(service, 'findOne').mockResolvedValue(demand as any);
            await expect(service.reject('1')).rejects.toThrow(BadRequestException);
        });

        it('should reject and notify', async () => {
            const demand = {
                getDataValue: (k) => ({ status: 'PENDING' })[k],
                employee: { userId: 'u1' }
            };
            jest.spyOn(service, 'findOne')
                .mockResolvedValueOnce(demand as any)
                .mockResolvedValueOnce({ id: 'updated' } as any);

            const result = await service.reject('1', 'Too expensive');

            expect(mockDemandModel.update).toHaveBeenCalled();
            expect(mockNotificationsService.createMany).toHaveBeenCalled();
            expect(result).toEqual({ id: 'updated' });
        });
    });

    describe('getStats', () => {
        it('should return stats', async () => {
            mockDemandModel.findAll.mockResolvedValue([
                { status: 'PENDING', totalPrice: 100 },
                { status: 'VALIDATED', totalPrice: 50 },
                { status: 'REJECTED', totalPrice: 10 },
            ]);

            const result = await service.getStats('d1', '2023-01-01', '2023-12-31');
            expect(result).toEqual({
                totalPending: 1,
                totalValidated: 1,
                totalRejected: 1,
                totalExpense: 50,
                total: 3,
            });
        });
    });
});

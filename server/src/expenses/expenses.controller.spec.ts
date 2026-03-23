import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { RolesGuard } from '../auth/roles.guard';

describe('ExpensesController', () => {
    let controller: ExpensesController;
    let service: ExpensesService;

    const mockExpensesService = {
        create: jest.fn(),
        findAll: jest.fn(),
        getStats: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ExpensesController],
            providers: [
                { provide: ExpensesService, useValue: mockExpensesService },
            ],
        })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ExpensesController>(ExpensesController);
        service = module.get<ExpensesService>(ExpensesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create an expense', async () => {
            const dto = { amount: 100 };
            mockExpensesService.create.mockResolvedValue({ id: '1', ...dto });
            const result = await controller.create(dto);
            expect(result).toEqual({ id: '1', amount: 100 });
            expect(service.create).toHaveBeenCalledWith(dto);
        });
    });

    describe('findAll', () => {
        it('should return all expenses with pagination parsing', async () => {
            mockExpensesService.findAll.mockResolvedValue({ data: [] });
            await controller.findAll('p1', '2', '20');
            expect(service.findAll).toHaveBeenCalledWith('p1', 2, 20);
        });

        it('should use defaults when pagination skipped', async () => {
            mockExpensesService.findAll.mockResolvedValue({ data: [] });
            await controller.findAll();
            expect(service.findAll).toHaveBeenCalledWith(undefined, 1, 10);
        });
    });

    describe('getStats', () => {
        it('should parse year and pass to service', async () => {
            mockExpensesService.getStats.mockResolvedValue({});
            await controller.getStats('2023');
            expect(service.getStats).toHaveBeenCalledWith(2023);
        });

        it('should pass undefined if no year provided', async () => {
            mockExpensesService.getStats.mockResolvedValue({});
            await controller.getStats();
            expect(service.getStats).toHaveBeenCalledWith(undefined);
        });
    });

    describe('findOne', () => {
        it('should return an expense', async () => {
            mockExpensesService.findOne.mockResolvedValue({ id: '1' });
            const result = await controller.findOne('1');
            expect(result).toEqual({ id: '1' });
            expect(service.findOne).toHaveBeenCalledWith('1');
        });
    });

    describe('update', () => {
        it('should update an expense', async () => {
            mockExpensesService.update.mockResolvedValue({ id: '1' });
            const result = await controller.update('1', { amount: 200 });
            expect(result).toEqual({ id: '1' });
            expect(service.update).toHaveBeenCalledWith('1', { amount: 200 });
        });
    });

    describe('remove', () => {
        it('should remove an expense', async () => {
            mockExpensesService.remove.mockResolvedValue({ success: true });
            const result = await controller.remove('1');
            expect(result).toEqual({ success: true });
            expect(service.remove).toHaveBeenCalledWith('1');
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DemandsController } from './demands.controller';
import { DemandsService } from './demands.service';
import { BadRequestException } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';

describe('DemandsController', () => {
    let controller: DemandsController;
    let service: DemandsService;

    const mockDemandsService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findByEmployee: jest.fn(),
        getStats: jest.fn(),
        findOne: jest.fn(),
        validate: jest.fn(),
        reject: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DemandsController],
            providers: [
                { provide: DemandsService, useValue: mockDemandsService },
            ],
        })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DemandsController>(DemandsController);
        service = module.get<DemandsService>(DemandsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('uploadFile', () => {
        it('should throw if no file provided', () => {
            expect(() => controller.uploadFile(undefined as any)).toThrow(BadRequestException);
        });

        it('should return file info', () => {
            const file = {
                originalname: 'test.pdf',
                filename: '123.pdf',
                mimetype: 'application/pdf',
                size: 1024,
            } as Express.Multer.File;

            expect(controller.uploadFile(file)).toEqual({
                filePath: '/uploads/demands/123.pdf',
                fileName: 'test.pdf',
                fileType: 'application/pdf',
                size: 1024,
            });
        });
    });

    describe('create', () => {
        it('should call service.create', async () => {
            const req = { user: { userId: 'u1' } };
            const dto = { importance: 'HIGH' };
            mockDemandsService.create.mockResolvedValue({ id: '1' });

            const result = await controller.create(dto, req);
            expect(result).toEqual({ id: '1' });
            expect(service.create).toHaveBeenCalledWith(dto, 'u1');
        });
    });

    describe('findAll', () => {
        it('should use user departmentId if HEAD_OF_DEPARTMENT', async () => {
            const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'd1' } };
            mockDemandsService.findAll.mockResolvedValue([{ id: '1' }]);

            await controller.findAll('d2', req);
            expect(service.findAll).toHaveBeenCalledWith('d1');
        });

        it('should use query departmentId if query provided', async () => {
            const req = { user: { role: 'ACCOUNTANT' } };
            mockDemandsService.findAll.mockResolvedValue([{ id: '1' }]);

            await controller.findAll('d2', req);
            expect(service.findAll).toHaveBeenCalledWith('d2');
        });

        it('should call findAll with no args if no dept', async () => {
            const req = { user: { role: 'MANAGER' } };
            mockDemandsService.findAll.mockResolvedValue([{ id: '1' }]);

            await controller.findAll(undefined as any, req);
            expect(service.findAll).toHaveBeenCalledWith();
        });
    });

    describe('findMyDemands', () => {
        it('should return my demands', async () => {
            const req = { user: { userId: 'u1' } };
            mockDemandsService.findByEmployee.mockResolvedValue([{ id: '1' }]);

            await controller.findMyDemands(req);
            expect(service.findByEmployee).toHaveBeenCalledWith('u1');
        });
    });

    describe('getStats', () => {
        it('should use user departmentId if HEAD_OF_DEPARTMENT', async () => {
            const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'd1' } };
            mockDemandsService.getStats.mockResolvedValue({ totalPending: 1 });

            await controller.getStats('d2', '2023-01-01', '2023-12-31', req);
            expect(service.getStats).toHaveBeenCalledWith('d1', '2023-01-01', '2023-12-31');
        });

        it('should return stats', async () => {
            const req = { user: { role: 'MANAGER' } };
            mockDemandsService.getStats.mockResolvedValue({ totalPending: 1 });

            const result = await controller.getStats(undefined as any, undefined as any, undefined as any, req);
            expect(result).toEqual({ totalPending: 1 });
            expect(service.getStats).toHaveBeenCalledWith(undefined, undefined, undefined);
        });
    });

    describe('findOne', () => {
        it('should return demand', async () => {
            mockDemandsService.findOne.mockResolvedValue({ id: '1' });
            const result = await controller.findOne('1');
            expect(result).toEqual({ id: '1' });
            expect(service.findOne).toHaveBeenCalledWith('1');
        });
    });

    describe('validate', () => {
        it('should validate demand', async () => {
            mockDemandsService.validate.mockResolvedValue({ id: '1', status: 'VALIDATED' });
            const result = await controller.validate('1');
            expect(result).toEqual({ id: '1', status: 'VALIDATED' });
            expect(service.validate).toHaveBeenCalledWith('1');
        });
    });

    describe('reject', () => {
        it('should reject demand with reason', async () => {
            mockDemandsService.reject.mockResolvedValue({ id: '1', status: 'REJECTED' });
            const result = await controller.reject('1', { reason: 'No' });
            expect(result).toEqual({ id: '1', status: 'REJECTED' });
            expect(service.reject).toHaveBeenCalledWith('1', 'No');
        });
    });
});

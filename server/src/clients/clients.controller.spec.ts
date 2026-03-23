import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { RolesGuard } from '../auth/roles.guard';

describe('ClientsController', () => {
    let controller: ClientsController;
    let service: ClientsService;

    const mockClientsService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        findByDepartment: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClientsController],
            providers: [
                { provide: ClientsService, useValue: mockClientsService },
            ],
        })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ClientsController>(ClientsController);
        service = module.get<ClientsService>(ClientsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call service.create with dto using departmentId for HEAD_OF_DEPARTMENT', async () => {
            const dto = { name: 'Client1' } as any;
            const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'd1' } };
            mockClientsService.create.mockResolvedValue({ id: '1', ...dto, departmentId: 'd1' });

            const result = await controller.create(dto, req);
            expect(result).toEqual({ id: '1', name: 'Client1', departmentId: 'd1' });
            expect(service.create).toHaveBeenCalledWith({ name: 'Client1', departmentId: 'd1' });
        });

        it('should call service.create normally for other roles', async () => {
            const dto = { name: 'Client1' };
            const req = { user: { role: 'MANAGER' } };
            mockClientsService.create.mockResolvedValue({ id: '1', ...dto });

            await controller.create(dto, req);
            expect(service.create).toHaveBeenCalledWith({ name: 'Client1' });
        });
    });

    describe('findAll', () => {
        it('should return all clients if no dept context', async () => {
            const req = { user: { role: 'MANAGER' } };
            mockClientsService.findAll.mockResolvedValue([{ id: '1' }]);

            const result = await controller.findAll(undefined as any, req);
            expect(result).toEqual([{ id: '1' }]);
            expect(service.findAll).toHaveBeenCalled();
        });

        it('should return by department if HEAD_OF_DEPARTMENT', async () => {
            const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'd1' } };
            mockClientsService.findByDepartment.mockResolvedValue([{ id: '1' }]);

            const result = await controller.findAll(undefined as any, req);
            expect(result).toEqual([{ id: '1' }]);
            expect(service.findByDepartment).toHaveBeenCalledWith('d1');
        });

        it('should return by department if query param provided', async () => {
            const req = { user: { role: 'MANAGER' } };
            mockClientsService.findByDepartment.mockResolvedValue([{ id: '1' }]);

            const result = await controller.findAll('d2', req);
            expect(result).toEqual([{ id: '1' }]);
            expect(service.findByDepartment).toHaveBeenCalledWith('d2');
        });
    });

    describe('findOne', () => {
        it('should return a client', async () => {
            mockClientsService.findOne.mockResolvedValue({ id: '1' });
            const result = await controller.findOne('1');
            expect(result).toEqual({ id: '1' });
            expect(service.findOne).toHaveBeenCalledWith('1');
        });
    });

    describe('update', () => {
        it('should update a client', async () => {
            mockClientsService.update.mockResolvedValue([1, [{ id: '1' }]]);
            const result = await controller.update('1', { name: 'Updated' });
            expect(result).toEqual([1, [{ id: '1' }]]);
            expect(service.update).toHaveBeenCalledWith('1', { name: 'Updated' });
        });
    });

    describe('remove', () => {
        it('should remove a client', async () => {
            mockClientsService.remove.mockResolvedValue(undefined);
            await controller.remove('1');
            expect(service.remove).toHaveBeenCalledWith('1');
        });
    });

    describe('findByDepartment', () => {
        it('should return clients for department', async () => {
            mockClientsService.findByDepartment.mockResolvedValue([{ id: '1' }]);
            const result = await controller.findByDepartment('d1');
            expect(result).toEqual([{ id: '1' }]);
            expect(service.findByDepartment).toHaveBeenCalledWith('d1');
        });
    });
});

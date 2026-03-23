import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceTemplatesService } from './invoice-templates.service';

describe('InvoicesController', () => {
    let controller: InvoicesController;
    let invoicesService: any;
    let templatesService: any;

    beforeEach(async () => {
        invoicesService = {
            create: jest.fn().mockResolvedValue({ id: 'inv-1' }),
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 'inv-1' }),
            update: jest.fn().mockResolvedValue({ id: 'inv-1' }),
            send: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'SENT' }),
            markPaid: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'PAID' }),
            reject: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'REJECTED' }),
            remove: jest.fn().mockResolvedValue(undefined),
            getStats: jest.fn().mockResolvedValue({ total: 5, totalRevenue: 1000 }),
        };

        templatesService = {
            findByDepartment: jest.fn().mockResolvedValue({ id: 'tpl-1' }),
            upsert: jest.fn().mockResolvedValue({ id: 'tpl-1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [InvoicesController],
            providers: [
                { provide: InvoicesService, useValue: invoicesService },
                { provide: InvoiceTemplatesService, useValue: templatesService },
            ],
        }).compile();

        controller = module.get<InvoicesController>(InvoicesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('MANAGER: passes query departmentId', async () => {
            const req = { user: { role: 'MANAGER', userId: 'u1' } };
            await controller.findAll('dept-1', req);
            expect(invoicesService.findAll).toHaveBeenCalledWith('dept-1');
        });

        it('MANAGER: passes undefined if no departmentId', async () => {
            const req = { user: { role: 'MANAGER', userId: 'u1' } };
            await controller.findAll(undefined as any, req);
            expect(invoicesService.findAll).toHaveBeenCalledWith(undefined);
        });

        it('HEAD_OF_DEPARTMENT: forced to own departmentId', async () => {
            const req = { user: { role: 'HEAD_OF_DEPARTMENT', userId: 'u2', departmentId: 'dept-2' } };
            await controller.findAll('dept-other', req);
            expect(invoicesService.findAll).toHaveBeenCalledWith('dept-2');
        });
    });

    describe('getStats', () => {
        it('MANAGER: passes query departmentId', async () => {
            const req = { user: { role: 'MANAGER', userId: 'u1' } };
            await controller.getStats('dept-1', undefined as any, undefined as any, req);
            expect(invoicesService.getStats).toHaveBeenCalledWith('dept-1', undefined, undefined);
        });

        it('HEAD_OF_DEPARTMENT: forced to own departmentId', async () => {
            const req = { user: { role: 'HEAD_OF_DEPARTMENT', userId: 'u2', departmentId: 'dept-2' } };
            await controller.getStats(undefined as any, undefined as any, undefined as any, req);
            expect(invoicesService.getStats).toHaveBeenCalledWith('dept-2', undefined, undefined);
        });
    });

    describe('create', () => {
        it('should pass dto and userId', async () => {
            const req = { user: { userId: 'u1' } };
            await controller.create({ projectId: 'p1' }, req);
            expect(invoicesService.create).toHaveBeenCalledWith({ projectId: 'p1' }, 'u1');
        });
    });

    describe('state transitions', () => {
        it('send delegates to service', async () => {
            await controller.send('inv-1');
            expect(invoicesService.send).toHaveBeenCalledWith('inv-1');
        });

        it('markPaid delegates to service', async () => {
            await controller.markPaid('inv-1');
            expect(invoicesService.markPaid).toHaveBeenCalledWith('inv-1');
        });

        it('reject delegates to service', async () => {
            await controller.reject('inv-1');
            expect(invoicesService.reject).toHaveBeenCalledWith('inv-1');
        });
    });

    describe('templates', () => {
        it('getTemplate delegates to templates service', async () => {
            await controller.getTemplate('dept-1');
            expect(templatesService.findByDepartment).toHaveBeenCalledWith('dept-1');
        });

        it('upsertTemplate delegates to templates service', async () => {
            await controller.upsertTemplate('dept-1', { companyName: 'Test' });
            expect(templatesService.upsert).toHaveBeenCalledWith('dept-1', { companyName: 'Test' });
        });
    });
});

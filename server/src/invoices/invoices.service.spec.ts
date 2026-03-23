import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { getModelToken } from '@nestjs/sequelize';
import { Invoice } from '../models/invoice.model';
import { InvoiceItem } from '../models/invoice-item.model';
import { DepartmentGoalsService } from '../organization/department-goals.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InvoicesService', () => {
    let service: InvoicesService;
    let invoiceModel: any;
    let invoiceItemModel: any;
    let goalsService: any;

    const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        status: 'CREATED',
        projectId: 'proj-1',
        departmentId: 'dept-1',
        clientId: 'client-1',
        createdById: 'user-1',
        subtotal: 1000,
        taxRate: 19.25,
        taxAmount: 192.5,
        total: 1192.5,
        update: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockResolvedValue(true),
    };

    beforeEach(async () => {
        invoiceModel = {
            create: jest.fn().mockResolvedValue({ ...mockInvoice }),
            findAll: jest.fn().mockResolvedValue([mockInvoice]),
            findByPk: jest.fn().mockResolvedValue(mockInvoice),
            findOne: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue([1, [mockInvoice]]),
        };

        invoiceItemModel = {
            bulkCreate: jest.fn().mockResolvedValue([]),
            destroy: jest.fn().mockResolvedValue(2),
        };

        goalsService = {
            findByDepartmentAndYear: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'goal-1', currentRevenue: 0 }),
            update: jest.fn().mockResolvedValue([1]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoicesService,
                { provide: getModelToken(Invoice), useValue: invoiceModel },
                { provide: getModelToken(InvoiceItem), useValue: invoiceItemModel },
                { provide: DepartmentGoalsService, useValue: goalsService },
            ],
        }).compile();

        service = module.get<InvoicesService>(InvoicesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create invoice with items and compute totals', async () => {
            const dto = {
                projectId: 'proj-1',
                departmentId: 'dept-1',
                clientId: 'client-1',
                taxRate: 19.25,
                items: [
                    { description: 'Web Design', quantity: 10, unitPrice: 50 },
                    { description: 'Hosting', quantity: 1, unitPrice: 500 },
                ],
            };

            await service.create(dto, 'user-1');

            expect(invoiceModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    invoiceNumber: expect.stringMatching(/^INV-\d{4}-\d{4}$/),
                    status: 'CREATED',
                    subtotal: 1000,
                    taxAmount: 192.5,
                    total: 1192.5,
                }),
            );
            expect(invoiceItemModel.bulkCreate).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ description: 'Web Design', amount: 500 }),
                    expect.objectContaining({ description: 'Hosting', amount: 500 }),
                ]),
            );
        });

        it('should auto-generate invoice number', async () => {
            invoiceModel.findOne.mockResolvedValueOnce({ invoiceNumber: 'INV-2026-0005' });
            const dto = { items: [] };
            await service.create(dto, 'user-1');
            expect(invoiceModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ invoiceNumber: expect.stringMatching(/^INV-\d{4}-\d{4}$/) }),
            );
        });
    });

    describe('findAll', () => {
        it('should return all invoices without filter', async () => {
            await service.findAll();
            expect(invoiceModel.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} }),
            );
        });

        it('should filter by departmentId', async () => {
            await service.findAll('dept-1');
            expect(invoiceModel.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ where: { departmentId: 'dept-1' } }),
            );
        });
    });

    describe('findOne', () => {
        it('should return invoice by id', async () => {
            const result = await service.findOne('inv-1');
            expect(result).toBeDefined();
            expect(invoiceModel.findByPk).toHaveBeenCalledWith('inv-1', expect.any(Object));
        });

        it('should throw NotFoundException if not found', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce(null);
            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('send', () => {
        it('should set status to SENT', async () => {
            await service.send('inv-1');
            expect(mockInvoice.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'SENT', sentAt: expect.any(Date) }),
            );
        });

        it('should reject if not CREATED status', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'SENT' });
            await expect(service.send('inv-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('markPaid', () => {
        it('should set status to PAID and increment revenue', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'SENT', update: jest.fn() });
            goalsService.findByDepartmentAndYear.mockResolvedValueOnce({ id: 'goal-1', currentRevenue: 500 });

            await service.markPaid('inv-1');

            expect(goalsService.update).toHaveBeenCalledWith('goal-1', { currentRevenue: 500 + mockInvoice.total });
        });

        it('should create goal if none exists', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'SENT', update: jest.fn() });
            goalsService.findByDepartmentAndYear.mockResolvedValueOnce(null);
            goalsService.create.mockResolvedValueOnce({ id: 'new-goal', currentRevenue: 0 });

            await service.markPaid('inv-1');

            expect(goalsService.create).toHaveBeenCalledWith(
                expect.objectContaining({ departmentId: 'dept-1', targetRevenue: 0, currentRevenue: 0 }),
            );
        });

        it('should reject if not SENT status', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'CREATED' });
            await expect(service.markPaid('inv-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('reject', () => {
        it('should set status to REJECTED', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'SENT', update: jest.fn() });
            await service.reject('inv-1');
        });

        it('should reject if not SENT status', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'CREATED' });
            await expect(service.reject('inv-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('update', () => {
        it('should reject update if not CREATED status', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'SENT' });
            await expect(service.update('inv-1', { notes: 'test' })).rejects.toThrow(BadRequestException);
        });
    });

    describe('remove', () => {
        it('should delete invoice and items', async () => {
            await service.remove('inv-1');
            expect(invoiceItemModel.destroy).toHaveBeenCalledWith({ where: { invoiceId: 'inv-1' } });
            expect(mockInvoice.destroy).toHaveBeenCalled();
        });

        it('should reject if not CREATED status', async () => {
            invoiceModel.findByPk.mockResolvedValueOnce({ ...mockInvoice, status: 'PAID' });
            await expect(service.remove('inv-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('getStats', () => {
        it('should return aggregated stats', async () => {
            invoiceModel.findAll.mockResolvedValueOnce([
                { status: 'PAID', total: 1000 },
                { status: 'PAID', total: 500 },
                { status: 'SENT', total: 300, dueDate: new Date('2020-01-01') },
                { status: 'CREATED', total: 200 },
            ]);
            const stats = await service.getStats();
            expect(stats.totalRevenue).toBe(1500);
            expect(stats.totalPending).toBe(500);
            expect(stats.overdue).toBe(1);
            expect(stats.countByStatus.PAID).toBe(2);
            expect(stats.countByStatus.SENT).toBe(1);
            expect(stats.countByStatus.CREATED).toBe(1);
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { getModelToken } from '@nestjs/sequelize';
import { InvoiceTemplate } from '../models/invoice-template.model';

describe('InvoiceTemplatesService', () => {
    let service: InvoiceTemplatesService;
    let templateModel: any;

    const mockTemplate = {
        id: 'tpl-1',
        departmentId: 'dept-1',
        companyName: 'MyCompany',
        address: '123 Main St',
        update: jest.fn().mockResolvedValue(true),
    };

    beforeEach(async () => {
        templateModel = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockTemplate),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoiceTemplatesService,
                { provide: getModelToken(InvoiceTemplate), useValue: templateModel },
            ],
        }).compile();

        service = module.get<InvoiceTemplatesService>(InvoiceTemplatesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findByDepartment', () => {
        it('should return template for department', async () => {
            templateModel.findOne.mockResolvedValueOnce(mockTemplate);
            const result = await service.findByDepartment('dept-1');
            expect(result).toEqual(mockTemplate);
            expect(templateModel.findOne).toHaveBeenCalledWith({ where: { departmentId: 'dept-1' } });
        });

        it('should return null if no template exists', async () => {
            const result = await service.findByDepartment('dept-2');
            expect(result).toBeNull();
        });
    });

    describe('upsert', () => {
        it('should create new template if none exists', async () => {
            await service.upsert('dept-1', { companyName: 'New Corp', address: '456 Elm St' });
            expect(templateModel.create).toHaveBeenCalledWith({
                companyName: 'New Corp',
                address: '456 Elm St',
                departmentId: 'dept-1',
            });
        });

        it('should update existing template', async () => {
            templateModel.findOne.mockResolvedValueOnce(mockTemplate);
            await service.upsert('dept-1', { companyName: 'Updated Corp' });
            expect(mockTemplate.update).toHaveBeenCalledWith({ companyName: 'Updated Corp' });
        });
    });
});

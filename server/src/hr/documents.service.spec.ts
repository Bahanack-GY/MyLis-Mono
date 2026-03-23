import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DocumentsService } from './documents.service';
import { Document } from '../models/document.model';
import { Employee } from '../models/employee.model';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentModel: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    documentModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };

    employeeModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getModelToken(Document), useValue: documentModel },
        { provide: getModelToken(Employee), useValue: employeeModel },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('create', () => {
    it('should create a document', async () => {
      const dto = { name: 'Contract.pdf', category: 'CONTRACT', employeeId: 'emp-1', uploadedById: 'user-1' };
      const mockDoc = { id: '1', ...dto };
      documentModel.create.mockResolvedValue(mockDoc);

      const result = await service.create(dto);
      expect(documentModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockDoc);
    });
  });

  describe('findAll', () => {
    it('should return all documents', async () => {
      const mockDocs = [{ id: '1', name: 'Contract.pdf' }];
      documentModel.findAll.mockResolvedValue(mockDocs);

      const result = await service.findAll();
      expect(documentModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockDocs);
    });
  });

  describe('findOne', () => {
    it('should find a document by id', async () => {
      const mockDoc = { id: '1', name: 'Contract.pdf' };
      documentModel.findByPk.mockResolvedValue(mockDoc);

      const result = await service.findOne('1');
      expect(documentModel.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ include: expect.any(Array) }));
      expect(result).toEqual(mockDoc);
    });
  });

  describe('findByUser', () => {
    it('should return documents uploaded by a given user', async () => {
      const mockDocs = [{ id: '1', uploadedById: 'user-1' }];
      documentModel.findAll.mockResolvedValue(mockDocs);

      const result = await service.findByUser('user-1');
      expect(documentModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { uploadedById: 'user-1' } }));
      expect(result).toEqual(mockDocs);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { SanctionsService } from './sanctions.service';
import { Sanction } from '../models/sanction.model';
import { Employee } from '../models/employee.model';
import { NotificationsService } from '../notifications/notifications.service';

describe('SanctionsService', () => {
  let service: SanctionsService;
  let sanctionModel: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    sanctionModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };

    employeeModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };

    notificationsService = {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanctionsService,
        { provide: getModelToken(Sanction), useValue: sanctionModel },
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<SanctionsService>(SanctionsService);
  });

  describe('create', () => {
    it('should create a sanction', async () => {
      const dto = { type: 'AVERTISSEMENT', title: 'Warning', severity: 'LEGER', employeeId: 'emp-1' };
      const mockSanction = { id: '1', ...dto };
      sanctionModel.create.mockResolvedValue(mockSanction);

      const result = await service.create(dto);
      expect(sanctionModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSanction);
    });
  });

  describe('findAll', () => {
    it('should return all sanctions', async () => {
      const mockSanctions = [{ id: '1', type: 'AVERTISSEMENT' }];
      sanctionModel.findAll.mockResolvedValue(mockSanctions);

      const result = await service.findAll();
      expect(sanctionModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockSanctions);
    });
  });

  describe('findOne', () => {
    it('should find a sanction by id', async () => {
      const mockSanction = { id: '1', type: 'AVERTISSEMENT' };
      sanctionModel.findByPk.mockResolvedValue(mockSanction);

      const result = await service.findOne('1');
      expect(sanctionModel.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ include: expect.any(Array) }));
      expect(result).toEqual(mockSanction);
    });
  });

  describe('findByEmployee', () => {
    it('should return sanctions for a given employee', async () => {
      const mockSanctions = [{ id: '1', employeeId: 'emp-1' }];
      sanctionModel.findAll.mockResolvedValue(mockSanctions);

      const result = await service.findByEmployee('emp-1');
      expect(sanctionModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { employeeId: 'emp-1' } }));
      expect(result).toEqual(mockSanctions);
    });
  });
});

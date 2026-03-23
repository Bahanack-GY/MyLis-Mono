import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { FormationsService } from './formations.service';
import { Formation } from '../models/formation.model';
import { Employee } from '../models/employee.model';

describe('FormationsService', () => {
  let service: FormationsService;
  let formationModel: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    formationModel = {
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
        FormationsService,
        { provide: getModelToken(Formation), useValue: formationModel },
        { provide: getModelToken(Employee), useValue: employeeModel },
      ],
    }).compile();

    service = module.get<FormationsService>(FormationsService);
  });

  describe('create', () => {
    it('should create a formation', async () => {
      const dto = { title: 'NestJS Training', organization: 'Udemy', employeeId: 'emp-1' };
      const mockFormation = { id: '1', ...dto };
      formationModel.create.mockResolvedValue(mockFormation);

      const result = await service.create(dto);
      expect(formationModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockFormation);
    });
  });

  describe('findAll', () => {
    it('should return all formations', async () => {
      const mockFormations = [{ id: '1', title: 'Training' }];
      formationModel.findAll.mockResolvedValue(mockFormations);

      const result = await service.findAll();
      expect(formationModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockFormations);
    });
  });

  describe('findOne', () => {
    it('should find a formation by id', async () => {
      const mockFormation = { id: '1', title: 'Training' };
      formationModel.findByPk.mockResolvedValue(mockFormation);

      const result = await service.findOne('1');
      expect(formationModel.findByPk).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockFormation);
    });
  });

  describe('findByEmployee', () => {
    it('should return formations for a given employee', async () => {
      const mockFormations = [{ id: '1', employeeId: 'emp-1' }];
      formationModel.findAll.mockResolvedValue(mockFormations);

      const result = await service.findByEmployee('emp-1');
      expect(formationModel.findAll).toHaveBeenCalledWith({ where: { employeeId: 'emp-1' } });
      expect(result).toEqual(mockFormations);
    });
  });
});

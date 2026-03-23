import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { EntretiensService } from './entretiens.service';
import { Entretien } from '../models/entretien.model';

describe('EntretiensService', () => {
  let service: EntretiensService;
  let entretienModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    entretienModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntretiensService,
        { provide: getModelToken(Entretien), useValue: entretienModel },
      ],
    }).compile();

    service = module.get<EntretiensService>(EntretiensService);
  });

  describe('create', () => {
    it('should create an entretien', async () => {
      const dto = { type: 'ANNUEL', title: 'Annual Review', employeeId: 'emp-1', status: 'SCHEDULED' };
      const mockEntretien = { id: '1', ...dto };
      entretienModel.create.mockResolvedValue(mockEntretien);

      const result = await service.create(dto);
      expect(entretienModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockEntretien);
    });
  });

  describe('findAll', () => {
    it('should return all entretiens', async () => {
      const mockEntretiens = [{ id: '1', type: 'ANNUEL' }];
      entretienModel.findAll.mockResolvedValue(mockEntretiens);

      const result = await service.findAll();
      expect(entretienModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEntretiens);
    });
  });

  describe('findOne', () => {
    it('should find an entretien by id', async () => {
      const mockEntretien = { id: '1', type: 'ANNUEL' };
      entretienModel.findByPk.mockResolvedValue(mockEntretien);

      const result = await service.findOne('1');
      expect(entretienModel.findByPk).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEntretien);
    });
  });

  describe('findByEmployee', () => {
    it('should return entretiens for a given employee', async () => {
      const mockEntretiens = [{ id: '1', employeeId: 'emp-1' }];
      entretienModel.findAll.mockResolvedValue(mockEntretiens);

      const result = await service.findByEmployee('emp-1');
      expect(entretienModel.findAll).toHaveBeenCalledWith({ where: { employeeId: 'emp-1' } });
      expect(result).toEqual(mockEntretiens);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { PositionsService } from './positions.service';
import { Position } from '../models/position.model';

describe('PositionsService', () => {
  let service: PositionsService;
  let positionModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    positionModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionsService,
        { provide: getModelToken(Position), useValue: positionModel },
      ],
    }).compile();

    service = module.get<PositionsService>(PositionsService);
  });

  describe('create', () => {
    it('should create a position', async () => {
      const dto = { title: 'Software Engineer', description: 'Builds things' };
      const mockPos = { id: '1', ...dto };
      positionModel.create.mockResolvedValue(mockPos);

      const result = await service.create(dto);
      expect(positionModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockPos);
    });
  });

  describe('findAll', () => {
    it('should return all positions', async () => {
      const mockPositions = [{ id: '1', title: 'Engineer' }];
      positionModel.findAll.mockResolvedValue(mockPositions);

      const result = await service.findAll();
      expect(positionModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockPositions);
    });
  });

  describe('findOne', () => {
    it('should find a position by id', async () => {
      const mockPos = { id: '1', title: 'Engineer' };
      positionModel.findByPk.mockResolvedValue(mockPos);

      const result = await service.findOne('1');
      expect(positionModel.findByPk).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockPos);
    });
  });
});

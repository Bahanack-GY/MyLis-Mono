import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DepartmentGoalsService } from './department-goals.service';
import { DepartmentGoal } from '../models/department-goal.model';

describe('DepartmentGoalsService', () => {
  let service: DepartmentGoalsService;
  let goalModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    goalModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentGoalsService,
        { provide: getModelToken(DepartmentGoal), useValue: goalModel },
      ],
    }).compile();

    service = module.get<DepartmentGoalsService>(DepartmentGoalsService);
  });

  describe('create', () => {
    it('should create a department goal', async () => {
      const dto = { departmentId: 'dept-1', year: 2026, targetRevenue: 500000 };
      const mockGoal = { id: '1', ...dto, currentRevenue: 0 };
      goalModel.create.mockResolvedValue(mockGoal);

      const result = await service.create(dto);
      expect(goalModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockGoal);
    });
  });

  describe('findAll', () => {
    it('should return all goals with department includes', async () => {
      const mockGoals = [{ id: '1', year: 2026 }];
      goalModel.findAll.mockResolvedValue(mockGoals);

      const result = await service.findAll();
      expect(goalModel.findAll).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toEqual(mockGoals);
    });
  });

  describe('findByDepartment', () => {
    it('should return goals for a department ordered by year DESC', async () => {
      const mockGoals = [{ id: '2', year: 2026 }, { id: '1', year: 2025 }];
      goalModel.findAll.mockResolvedValue(mockGoals);

      const result = await service.findByDepartment('dept-1');
      expect(goalModel.findAll).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1' },
        order: [['year', 'DESC']],
      });
      expect(result).toEqual(mockGoals);
    });
  });

  describe('findByDepartmentAndYear', () => {
    it('should return a single goal for a department and year', async () => {
      const mockGoal = { id: '1', departmentId: 'dept-1', year: 2026 };
      goalModel.findOne.mockResolvedValue(mockGoal);

      const result = await service.findByDepartmentAndYear('dept-1', 2026);
      expect(goalModel.findOne).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1', year: 2026 },
      });
      expect(result).toEqual(mockGoal);
    });
  });

  describe('update', () => {
    it('should update the goal', async () => {
      const updated = [1, [{ id: '1', targetRevenue: 600000 }]];
      goalModel.update.mockResolvedValue(updated);

      const result = await service.update('1', { targetRevenue: 600000 });
      expect(goalModel.update).toHaveBeenCalledWith(
        { targetRevenue: 600000 },
        { where: { id: '1' }, returning: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should destroy the goal when found', async () => {
      const mockGoal = { id: '1', destroy: jest.fn() };
      goalModel.findByPk.mockResolvedValue(mockGoal);

      await service.remove('1');
      expect(mockGoal.destroy).toHaveBeenCalled();
    });

    it('should do nothing when goal not found', async () => {
      goalModel.findByPk.mockResolvedValue(null);
      await expect(service.remove('999')).resolves.toBeUndefined();
    });
  });
});

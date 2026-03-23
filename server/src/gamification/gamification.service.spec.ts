import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { GamificationService } from './gamification.service';
import { Employee } from '../models/employee.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { Task } from '../models/task.model';

describe('GamificationService', () => {
  let service: GamificationService;
  let employeeModel: Record<string, jest.Mock>;
  let employeeBadgeModel: Record<string, jest.Mock>;
  let taskModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    employeeModel = {
      findByPk: jest.fn(),
    };
    employeeBadgeModel = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    taskModel = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: getModelToken(EmployeeBadge), useValue: employeeBadgeModel },
        { provide: getModelToken(Task), useValue: taskModel },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  describe('processTaskCompletion', () => {
    const mockEmployee = (currentPoints: number) => ({
      getDataValue: jest.fn().mockReturnValue(currentPoints),
      update: jest.fn().mockResolvedValue(undefined),
    });

    const mockTask = (difficulty: string, dueDate?: string) => ({
      getDataValue: jest.fn().mockImplementation((key: string) => {
        if (key === 'difficulty') return difficulty;
        if (key === 'dueDate') return dueDate || null;
        return null;
      }),
    });

    it('should award EASY points (10) for easy tasks', async () => {
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(3); // no badge milestone
      employeeBadgeModel.findOne.mockResolvedValue(null);

      const result = await service.processTaskCompletion('emp-1', mockTask('EASY') as any);

      expect(result.pointsEarned).toBe(10);
      expect(result.totalPoints).toBe(10);
      expect(emp.update).toHaveBeenCalledWith({ points: 10 });
    });

    it('should award MEDIUM points (20) for medium tasks', async () => {
      const emp = mockEmployee(50);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(3);

      const result = await service.processTaskCompletion('emp-1', mockTask('MEDIUM') as any);

      expect(result.pointsEarned).toBe(20);
      expect(result.totalPoints).toBe(70);
    });

    it('should award HARD points (40) for hard tasks', async () => {
      const emp = mockEmployee(100);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(3);

      const result = await service.processTaskCompletion('emp-1', mockTask('HARD') as any);

      expect(result.pointsEarned).toBe(40);
      expect(result.totalPoints).toBe(140);
    });

    it('should default to 20 points for unknown difficulty', async () => {
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(1);

      const result = await service.processTaskCompletion('emp-1', mockTask('UNKNOWN') as any);

      expect(result.pointsEarned).toBe(20);
    });

    it('should add early bonus (+10) when completed 3+ days before due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(1);

      const result = await service.processTaskCompletion('emp-1', mockTask('MEDIUM', futureDate.toISOString()) as any);

      expect(result.pointsEarned).toBe(30); // 20 base + 10 early
    });

    it('should add on-time bonus (+5) when completed within 0-2 days of due date', async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 1); // 1 day from now
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(1);

      const result = await service.processTaskCompletion('emp-1', mockTask('MEDIUM', soonDate.toISOString()) as any);

      expect(result.pointsEarned).toBe(25); // 20 base + 5 on-time
    });

    it('should not add bonus when completed after due date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2); // 2 days ago
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(1);

      const result = await service.processTaskCompletion('emp-1', mockTask('MEDIUM', pastDate.toISOString()) as any);

      expect(result.pointsEarned).toBe(20); // base only
    });

    it('should not add bonus when no due date', async () => {
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(1);

      const result = await service.processTaskCompletion('emp-1', mockTask('MEDIUM') as any);

      expect(result.pointsEarned).toBe(20); // base only
    });

    it('should create badge when milestone is reached', async () => {
      const emp = mockEmployee(80);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(5); // milestone for badge 1 "First Steps"
      employeeBadgeModel.findOne.mockResolvedValue(null); // badge not yet earned
      employeeBadgeModel.create.mockResolvedValue({});

      const result = await service.processTaskCompletion('emp-1', mockTask('EASY') as any);

      expect(employeeBadgeModel.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        badgeNumber: 1,
        title: 'First Steps',
        milestone: 5,
      });
      expect(result.newBadge).toEqual({
        badgeNumber: 1,
        title: 'First Steps',
        milestone: 5,
      });
    });

    it('should not create badge when milestone already earned', async () => {
      const emp = mockEmployee(80);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(5);
      employeeBadgeModel.findOne.mockResolvedValue({ id: 'existing-badge' }); // already earned

      const result = await service.processTaskCompletion('emp-1', mockTask('EASY') as any);

      expect(employeeBadgeModel.create).not.toHaveBeenCalled();
      expect(result.newBadge).toBeUndefined();
    });

    it('should not create badge when count does not match any milestone', async () => {
      const emp = mockEmployee(0);
      employeeModel.findByPk.mockResolvedValue(emp);
      taskModel.count.mockResolvedValue(7); // not a milestone

      const result = await service.processTaskCompletion('emp-1', mockTask('EASY') as any);

      expect(employeeBadgeModel.findOne).not.toHaveBeenCalled();
      expect(employeeBadgeModel.create).not.toHaveBeenCalled();
      expect(result.newBadge).toBeUndefined();
    });
  });

  describe('getEmployeeBadges', () => {
    it('should return badges ordered by badgeNumber', async () => {
      const mockBadges = [
        { id: 'b1', badgeNumber: 1, title: 'First Steps', milestone: 5 },
        { id: 'b2', badgeNumber: 2, title: 'Getting Started', milestone: 10 },
      ];
      employeeBadgeModel.findAll.mockResolvedValue(mockBadges);

      const result = await service.getEmployeeBadges('emp-1');

      expect(employeeBadgeModel.findAll).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        order: [['badgeNumber', 'ASC']],
      });
      expect(result).toEqual(mockBadges);
    });

    it('should return empty array when no badges found', async () => {
      employeeBadgeModel.findAll.mockResolvedValue([]);
      const result = await service.getEmployeeBadges('emp-999');
      expect(result).toEqual([]);
    });
  });
});

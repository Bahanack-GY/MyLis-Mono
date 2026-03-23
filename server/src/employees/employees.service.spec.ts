import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { EmployeesService } from './employees.service';
import { Employee } from '../models/employee.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { Task } from '../models/task.model';
import { UsersService } from '../users/users.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeModel: Record<string, jest.Mock>;
  let employeeBadgeModel: Record<string, jest.Mock>;
  let taskModel: Record<string, jest.Mock>;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;

  beforeEach(async () => {
    employeeModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    employeeBadgeModel = {
      findAll: jest.fn(),
    };
    taskModel = {
      findAll: jest.fn(),
    };
    usersService = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: getModelToken(EmployeeBadge), useValue: employeeBadgeModel },
        { provide: getModelToken(Task), useValue: taskModel },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  describe('findAll', () => {
    it('should return all employees with includes', async () => {
      const mockEmployees = [{ id: '1', firstName: 'John' }];
      employeeModel.findAll.mockResolvedValue(mockEmployees);

      const result = await service.findAll();
      expect(employeeModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ include: expect.any(Array) }));
      expect(result).toEqual(mockEmployees);
    });

    it('should filter by departmentId when provided', async () => {
      const mockEmployees = [{ id: '1', firstName: 'John', departmentId: 'dept-1' }];
      employeeModel.findAll.mockResolvedValue(mockEmployees);

      const result = await service.findAll('dept-1');
      expect(employeeModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-1' },
          include: expect.any(Array),
        }),
      );
      expect(result).toEqual(mockEmployees);
    });

    it('should not filter by departmentId when not provided', async () => {
      employeeModel.findAll.mockResolvedValue([]);

      await service.findAll();
      expect(employeeModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findOne', () => {
    it('should find an employee by id with includes', async () => {
      const mockEmployee = { id: '1', firstName: 'John' };
      employeeModel.findByPk.mockResolvedValue(mockEmployee);

      const result = await service.findOne('1');
      expect(employeeModel.findByPk).toHaveBeenCalledWith('1', { include: expect.any(Array) });
      expect(result).toEqual(mockEmployee);
    });

    it('should return null when employee not found', async () => {
      employeeModel.findByPk.mockResolvedValue(null);
      const result = await service.findOne('999');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user and employee when user does not exist', async () => {
      usersService.findOne!.mockResolvedValue(null);
      usersService.create!.mockResolvedValue({ id: 'user-1', email: 'john@test.com' });
      employeeModel.create.mockResolvedValue({ id: 'emp-1', firstName: 'John', userId: 'user-1' });

      const dto = { email: 'john@test.com', firstName: 'John', lastName: 'Doe', password: 'pass123' };
      const result = await service.create(dto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john@test.com', password: 'pass123', role: 'EMPLOYEE' }),
      );
      expect(employeeModel.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
      expect(result).toHaveProperty('id', 'emp-1');
    });

    it('should use existing user when one is found', async () => {
      usersService.findOne!.mockResolvedValue({ id: 'user-existing', email: 'existing@test.com' });
      employeeModel.create.mockResolvedValue({ id: 'emp-2', userId: 'user-existing' });

      const dto = { email: 'existing@test.com', firstName: 'Jane' };
      const result = await service.create(dto);

      expect(usersService.create).not.toHaveBeenCalled();
      expect(employeeModel.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-existing' }));
      expect(result).toHaveProperty('id', 'emp-2');
    });

    it('should use default password when none provided', async () => {
      usersService.findOne!.mockResolvedValue(null);
      usersService.create!.mockResolvedValue({ id: 'user-3', email: 'a@b.com' });
      employeeModel.create.mockResolvedValue({ id: 'emp-3' });

      await service.create({ email: 'a@b.com', firstName: 'Test' });
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'ChangeMe123!' }),
      );
    });
  });

  describe('update', () => {
    it('should update and return the employee', async () => {
      const updated = [1, [{ id: '1', firstName: 'Updated' }]];
      employeeModel.update.mockResolvedValue(updated);

      const result = await service.update('1', { firstName: 'Updated' });
      expect(employeeModel.update).toHaveBeenCalledWith(
        { firstName: 'Updated' },
        { where: { id: '1' }, returning: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should destroy the employee when found', async () => {
      const mockEmployee = { id: '1', destroy: jest.fn() };
      employeeModel.findByPk.mockResolvedValue(mockEmployee);

      await service.remove('1');
      expect(mockEmployee.destroy).toHaveBeenCalled();
    });

    it('should do nothing when employee not found', async () => {
      employeeModel.findByPk.mockResolvedValue(null);
      await expect(service.remove('999')).resolves.toBeUndefined();
    });
  });

  describe('dismiss', () => {
    it('should set dismissed=true and dismissedAt, then reload', async () => {
      const mockEmployee = {
        dismissed: false,
        dismissedAt: null as Date | null,
        save: jest.fn().mockResolvedValue(undefined),
        reload: jest.fn().mockResolvedValue({ id: '1', dismissed: true }),
      };
      employeeModel.findByPk.mockResolvedValue(mockEmployee);

      const result = await service.dismiss('1');

      expect(mockEmployee.dismissed).toBe(true);
      expect(mockEmployee.dismissedAt).toBeInstanceOf(Date);
      expect(mockEmployee.save).toHaveBeenCalled();
      expect(mockEmployee.reload).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toBeDefined();
    });

    it('should return null when employee not found', async () => {
      employeeModel.findByPk.mockResolvedValue(null);
      const result = await service.dismiss('999');
      expect(result).toBeNull();
    });
  });

  describe('reinstate', () => {
    it('should set dismissed=false and dismissedAt=null, then reload', async () => {
      const mockEmployee = {
        dismissed: true,
        dismissedAt: new Date() as Date | null,
        save: jest.fn().mockResolvedValue(undefined),
        reload: jest.fn().mockResolvedValue({ id: '1', dismissed: false, dismissedAt: null }),
      };
      employeeModel.findByPk.mockResolvedValue(mockEmployee);

      const result = await service.reinstate('1');

      expect(mockEmployee.dismissed).toBe(false);
      expect(mockEmployee.dismissedAt).toBeNull();
      expect(mockEmployee.save).toHaveBeenCalled();
      expect(mockEmployee.reload).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toBeDefined();
    });

    it('should return null when employee not found', async () => {
      employeeModel.findByPk.mockResolvedValue(null);
      const result = await service.reinstate('999');
      expect(result).toBeNull();
    });
  });

  describe('getEmployeeStats', () => {
    it('should return weeklyActivity, productivityData, and points', async () => {
      taskModel.findAll.mockResolvedValue([]);
      employeeModel.findByPk.mockResolvedValue({
        getDataValue: jest.fn().mockReturnValue(75),
      });

      const result = await service.getEmployeeStats('emp-1');
      expect(result).toHaveProperty('weeklyActivity');
      expect(result).toHaveProperty('productivityData');
      expect(result).toHaveProperty('points', 75);
      expect(result.weeklyActivity).toHaveLength(7);
      expect(result.productivityData).toHaveLength(12);
    });

    it('should calculate hours from startTime/endTime when available', async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const completedTask = {
        updatedAt: now,
        state: 'COMPLETED',
        startTime: '09:00',
        endTime: '11:30',
        createdAt: now,
      };
      taskModel.findAll
        .mockResolvedValueOnce([completedTask])
        .mockResolvedValueOnce([completedTask]);
      employeeModel.findByPk.mockResolvedValue({
        getDataValue: jest.fn().mockReturnValue(0),
      });

      const result = await service.getEmployeeStats('emp-1');
      const mappedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      expect(result.weeklyActivity[mappedIndex].hours).toBe(2.5);
      expect(result.weeklyActivity[mappedIndex].active).toBe(true);
    });

    it('should default to 2 hours per task when no time tracking', async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const completedTask = {
        updatedAt: now,
        state: 'COMPLETED',
        startTime: null,
        endTime: null,
        createdAt: now,
      };
      taskModel.findAll
        .mockResolvedValueOnce([completedTask])
        .mockResolvedValueOnce([completedTask]);
      employeeModel.findByPk.mockResolvedValue({
        getDataValue: jest.fn().mockReturnValue(0),
      });

      const result = await service.getEmployeeStats('emp-1');
      const mappedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      expect(result.weeklyActivity[mappedIndex].hours).toBe(2);
    });

    it('should calculate monthly productivity percentage', async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const tasks = [
        { createdAt: now, state: 'COMPLETED', updatedAt: now },
        { createdAt: now, state: 'COMPLETED', updatedAt: now },
        { createdAt: now, state: 'IN_PROGRESS', updatedAt: now },
        { createdAt: now, state: 'CREATED', updatedAt: now },
      ];
      taskModel.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(tasks);
      employeeModel.findByPk.mockResolvedValue({
        getDataValue: jest.fn().mockReturnValue(0),
      });

      const result = await service.getEmployeeStats('emp-1');
      expect(result.productivityData[currentMonth].value).toBe(50);
    });
  });

  describe('getLeaderboard', () => {
    it('should return ranked employees ordered by points', async () => {
      const mockEmployees = [
        {
          get: jest.fn().mockReturnValue({
            id: 'emp-1', firstName: 'Alice', lastName: 'Smith',
            avatarUrl: 'http://img/alice.jpg', points: 200,
            department: { name: 'Engineering' }, position: { title: 'Senior Dev' },
          }),
        },
        {
          get: jest.fn().mockReturnValue({
            id: 'emp-2', firstName: 'Bob', lastName: 'Jones',
            avatarUrl: null, points: 100,
            department: { name: 'Marketing' }, position: { title: 'Designer' },
          }),
        },
      ];
      employeeModel.findAll.mockResolvedValue(mockEmployees);

      const result = await service.getLeaderboard(5);

      expect(employeeModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { dismissed: false },
        order: [['points', 'DESC']],
        limit: 5,
      }));

      expect(result).toEqual([
        {
          id: 'emp-1', rank: 1, firstName: 'Alice', lastName: 'Smith',
          avatarUrl: 'http://img/alice.jpg', department: 'Engineering',
          positionTitle: 'Senior Dev', points: 200,
        },
        {
          id: 'emp-2', rank: 2, firstName: 'Bob', lastName: 'Jones',
          avatarUrl: null, department: 'Marketing',
          positionTitle: 'Designer', points: 100,
        },
      ]);
    });

    it('should default to limit 5', async () => {
      employeeModel.findAll.mockResolvedValue([]);
      await service.getLeaderboard();
      expect(employeeModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
    });

    it('should handle missing department/position gracefully', async () => {
      const mockEmployees = [
        {
          get: jest.fn().mockReturnValue({
            id: 'emp-1', firstName: '', lastName: '',
            avatarUrl: null, points: 0,
            department: null, position: null,
          }),
        },
      ];
      employeeModel.findAll.mockResolvedValue(mockEmployees);

      const result = await service.getLeaderboard();
      expect(result[0].department).toBe('');
      expect(result[0].positionTitle).toBe('');
    });
  });

  describe('getEmployeeBadges', () => {
    it('should return badges ordered by badgeNumber', async () => {
      const mockBadges = [
        { id: 'b1', employeeId: 'emp-1', badgeNumber: 1, title: 'First Steps', milestone: 5 },
        { id: 'b2', employeeId: 'emp-1', badgeNumber: 2, title: 'Getting Started', milestone: 10 },
      ];
      employeeBadgeModel.findAll.mockResolvedValue(mockBadges);

      const result = await service.getEmployeeBadges('emp-1');

      expect(employeeBadgeModel.findAll).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        order: [['badgeNumber', 'ASC']],
      });
      expect(result).toEqual(mockBadges);
    });

    it('should return empty array when no badges', async () => {
      employeeBadgeModel.findAll.mockResolvedValue([]);
      const result = await service.getEmployeeBadges('emp-999');
      expect(result).toEqual([]);
    });
  });
});

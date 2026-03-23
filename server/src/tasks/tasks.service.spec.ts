import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from '../models/task.model';
import { Employee } from '../models/employee.model';
import { Ticket } from '../models/ticket.model';
import { Department } from '../models/department.model';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService } from '../gamification/gamification.service';

describe('TasksService', () => {
  let service: TasksService;
  let taskModel: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;
  let ticketModel: Record<string, jest.Mock>;
  let departmentModel: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;
  let gamificationService: Record<string, jest.Mock>;

  beforeEach(async () => {
    taskModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    employeeModel = {
      findOne: jest.fn(),
    };
    ticketModel = {
      update: jest.fn(),
      findByPk: jest.fn(),
    };
    departmentModel = {
      findByPk: jest.fn(),
    };
    notificationsService = {
      createMany: jest.fn().mockResolvedValue(undefined),
    };
    gamificationService = {
      processTaskCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task), useValue: taskModel },
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: getModelToken(Ticket), useValue: ticketModel },
        { provide: getModelToken(Department), useValue: departmentModel },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: GamificationService, useValue: gamificationService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('should create a task', async () => {
      const dto = { title: 'Fix bug', state: 'CREATED', assignedToId: 'emp-1', projectId: 'proj-1' };
      const mockTask = { id: '1', ...dto };
      taskModel.create.mockResolvedValue(mockTask);

      const result = await service.create(dto);
      expect(taskModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTask);
    });
  });

  describe('findAll', () => {
    it('should return all tasks with Employee and Team includes', async () => {
      const mockTasks = [{ id: '1', title: 'Task 1' }];
      taskModel.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll();
      expect(taskModel.findAll).toHaveBeenCalledWith({ where: {}, include: expect.any(Array) });
      expect(result).toEqual(mockTasks);
    });

    it('should filter tasks by departmentId via Employee association', async () => {
      const mockTasks = [{ id: '1', title: 'Dept Task' }];
      taskModel.findAll.mockResolvedValue(mockTasks);

      const result = await service.findAll('dept-1');
      expect(taskModel.findAll).toHaveBeenCalledWith({
        where: {},
        include: expect.arrayContaining([
          expect.objectContaining({ where: { departmentId: 'dept-1' }, required: true }),
        ]),
      });
      expect(result).toEqual(mockTasks);
    });

    it('should not filter by department when departmentId is undefined', async () => {
      taskModel.findAll.mockResolvedValue([]);

      await service.findAll();
      const call = taskModel.findAll.mock.calls[0][0];
      const hasWhereClause = call.include.some((inc: any) => inc.where);
      expect(hasWhereClause).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should find a task by id with includes', async () => {
      const mockTask = { id: '1', title: 'Task 1' };
      taskModel.findByPk.mockResolvedValue(mockTask);

      const result = await service.findOne('1');
      expect(taskModel.findByPk).toHaveBeenCalledWith('1', { include: expect.any(Array) });
      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      taskModel.findByPk.mockResolvedValue(null);
      const result = await service.findOne('999');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update the task', async () => {
      const updated = [1, [{ id: '1', state: 'COMPLETED' }]];
      taskModel.update.mockResolvedValue(updated);

      const result = await service.update('1', { state: 'COMPLETED' });
      expect(taskModel.update).toHaveBeenCalledWith(
        { state: 'COMPLETED' },
        { where: { id: '1' }, returning: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should destroy the task when found', async () => {
      const mockTask = { id: '1', destroy: jest.fn() };
      taskModel.findByPk.mockResolvedValue(mockTask);

      await service.remove('1');
      expect(mockTask.destroy).toHaveBeenCalled();
    });

    it('should do nothing when task not found', async () => {
      taskModel.findByPk.mockResolvedValue(null);
      await expect(service.remove('999')).resolves.toBeUndefined();
    });
  });

  describe('findByProject', () => {
    it('should return tasks for a given project', async () => {
      const mockTasks = [{ id: '1', projectId: 'proj-1' }];
      taskModel.findAll.mockResolvedValue(mockTasks);

      const result = await service.findByProject('proj-1');
      expect(taskModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: 'proj-1' } }),
      );
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findByEmployee', () => {
    it('should return tasks assigned to a given employee', async () => {
      const mockTasks = [{ id: '1', assignedToId: 'emp-1' }];
      taskModel.findAll.mockResolvedValue(mockTasks);

      const result = await service.findByEmployee('emp-1');
      expect(taskModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { assignedToId: 'emp-1' } }),
      );
      expect(result).toEqual(mockTasks);
    });
  });

  describe('findByUserId', () => {
    it('should find employee then return their tasks', async () => {
      employeeModel.findOne.mockResolvedValue({ id: 'emp-1' });
      const mockTasks = [{ id: 't1', assignedToId: 'emp-1' }];
      taskModel.findAll.mockResolvedValue(mockTasks);

      const result = await service.findByUserId('user-1');
      expect(employeeModel.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array when employee not found', async () => {
      employeeModel.findOne.mockResolvedValue(null);
      const result = await service.findByUserId('user-999');
      expect(result).toEqual([]);
    });
  });

  describe('updateStateForUser', () => {
    const mockEmployee = {
      id: 'emp-1',
      getDataValue: jest.fn().mockImplementation((key: string) => {
        if (key === 'firstName') return 'John';
        if (key === 'lastName') return 'Doe';
        return null;
      }),
    };

    const createMockTask = (overrides: any = {}) => ({
      getDataValue: jest.fn().mockImplementation((key: string) => {
        const values: Record<string, any> = {
          assignedToId: 'emp-1',
          ticketId: null,
          ...overrides,
        };
        return values[key] ?? null;
      }),
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockImplementation(function (this: any) { return Promise.resolve(this); }),
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeModel.findOne.mockResolvedValue(null);
      await expect(service.updateStateForUser('t1', 'user-1', 'COMPLETED'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when task not found', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      taskModel.findByPk.mockResolvedValue(null);
      await expect(service.updateStateForUser('t1', 'user-1', 'COMPLETED'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task is not assigned to employee', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask({ assignedToId: 'emp-other' });
      taskModel.findByPk.mockResolvedValue(task);

      await expect(service.updateStateForUser('t1', 'user-1', 'IN_PROGRESS'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should update state and call gamification on COMPLETED', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask();
      taskModel.findByPk.mockResolvedValue(task);

      const gamResult = { pointsEarned: 20, totalPoints: 120, newBadge: undefined };
      gamificationService.processTaskCompletion.mockResolvedValue(gamResult);

      const result = await service.updateStateForUser('t1', 'user-1', 'COMPLETED');

      expect(task.set).toHaveBeenCalledWith('state', 'COMPLETED');
      expect(task.save).toHaveBeenCalled();
      expect(gamificationService.processTaskCompletion).toHaveBeenCalledWith('emp-1', task);
      expect(result.gamification).toEqual(gamResult);
    });

    it('should NOT call gamification for non-COMPLETED states', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask();
      taskModel.findByPk.mockResolvedValue(task);

      const result = await service.updateStateForUser('t1', 'user-1', 'IN_PROGRESS');

      expect(task.set).toHaveBeenCalledWith('state', 'IN_PROGRESS');
      expect(gamificationService.processTaskCompletion).not.toHaveBeenCalled();
      expect(result.gamification).toBeUndefined();
    });

    it('should set blockReason when state is BLOCKED', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask();
      taskModel.findByPk.mockResolvedValue(task);

      await service.updateStateForUser('t1', 'user-1', 'BLOCKED', 'Waiting for approval');

      expect(task.set).toHaveBeenCalledWith('state', 'BLOCKED');
      expect(task.set).toHaveBeenCalledWith('blockReason', 'Waiting for approval');
    });

    it('should clear blockReason when state is not BLOCKED', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask();
      taskModel.findByPk.mockResolvedValue(task);

      await service.updateStateForUser('t1', 'user-1', 'IN_PROGRESS');

      expect(task.set).toHaveBeenCalledWith('blockReason', null);
    });

    it('should sync linked ticket status and create notifications on COMPLETED', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask({ ticketId: 'ticket-1' });
      taskModel.findByPk.mockResolvedValue(task);

      gamificationService.processTaskCompletion.mockResolvedValue({ pointsEarned: 20, totalPoints: 20 });

      const mockTicket = {
        getDataValue: jest.fn().mockImplementation((key: string) => {
          if (key === 'title') return 'Fix login bug';
          if (key === 'createdById') return 'user-creator';
          if (key === 'targetDepartmentId') return 'dept-1';
          return null;
        }),
      };
      ticketModel.findByPk.mockResolvedValue(mockTicket);

      const mockDept = {
        getDataValue: jest.fn().mockImplementation((key: string) => {
          if (key === 'head') return {
            getDataValue: jest.fn().mockReturnValue('user-hod'),
          };
          return null;
        }),
      };
      departmentModel.findByPk.mockResolvedValue(mockDept);

      await service.updateStateForUser('t1', 'user-1', 'COMPLETED');

      expect(ticketModel.update).toHaveBeenCalledWith(
        { status: 'COMPLETED' },
        { where: { id: 'ticket-1' } },
      );
      expect(notificationsService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'user-creator', type: 'ticket' }),
          expect.objectContaining({ userId: 'user-hod', type: 'ticket' }),
        ]),
      );
    });

    it('should not send duplicate notification if HOD is the ticket creator', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask({ ticketId: 'ticket-1' });
      taskModel.findByPk.mockResolvedValue(task);

      gamificationService.processTaskCompletion.mockResolvedValue({ pointsEarned: 20, totalPoints: 20 });

      const mockTicket = {
        getDataValue: jest.fn().mockImplementation((key: string) => {
          if (key === 'title') return 'Fix bug';
          if (key === 'createdById') return 'user-same';
          if (key === 'targetDepartmentId') return 'dept-1';
          return null;
        }),
      };
      ticketModel.findByPk.mockResolvedValue(mockTicket);

      const mockDept = {
        getDataValue: jest.fn().mockImplementation((key: string) => {
          if (key === 'head') return {
            getDataValue: jest.fn().mockReturnValue('user-same'),
          };
          return null;
        }),
      };
      departmentModel.findByPk.mockResolvedValue(mockDept);

      await service.updateStateForUser('t1', 'user-1', 'COMPLETED');

      // Only one notification (to creator), not a duplicate for HOD
      const calls = notificationsService.createMany.mock.calls;
      expect(calls[0][0]).toHaveLength(1);
    });

    it('should not sync ticket when no ticketId is linked', async () => {
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      const task = createMockTask({ ticketId: null });
      taskModel.findByPk.mockResolvedValue(task);

      gamificationService.processTaskCompletion.mockResolvedValue({ pointsEarned: 10, totalPoints: 10 });

      await service.updateStateForUser('t1', 'user-1', 'COMPLETED');

      expect(ticketModel.update).not.toHaveBeenCalled();
      expect(notificationsService.createMany).not.toHaveBeenCalled();
    });
  });
});

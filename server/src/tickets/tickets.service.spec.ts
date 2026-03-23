import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { TicketsService } from './tickets.service';
import { Ticket } from '../models/ticket.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketModel: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;
  let departmentModel: Record<string, jest.Mock>;
  let tasksService: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    ticketModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    employeeModel = {
      findByPk: jest.fn(),
      findOne: jest.fn(),
    };
    departmentModel = {
      findByPk: jest.fn(),
    };
    tasksService = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };
    notificationsService = {
      createMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getModelToken(Ticket), useValue: ticketModel },
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: getModelToken(Department), useValue: departmentModel },
        { provide: TasksService, useValue: tasksService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  describe('create', () => {
    it('should create a ticket with status OPEN and createdById', async () => {
      const dto = { title: 'Bug report', description: 'Something broke', priority: 'HIGH' };
      const mockTicket = { id: '1', ...dto, status: 'OPEN', createdById: 'user-1' };
      ticketModel.create.mockResolvedValue(mockTicket);

      const result = await service.create(dto, 'user-1');
      expect(ticketModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Bug report',
          createdById: 'user-1',
          status: 'OPEN',
        }),
      );
      expect(result).toEqual(mockTicket);
    });
  });

  describe('findAll', () => {
    it('should return all tickets ordered by createdAt DESC', async () => {
      const mockTickets = [{ id: '2' }, { id: '1' }];
      ticketModel.findAll.mockResolvedValue(mockTickets);

      const result = await service.findAll();
      expect(ticketModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ order: [['createdAt', 'DESC']] }),
      );
      expect(result).toEqual(mockTickets);
    });
  });

  describe('findOne', () => {
    it('should find a ticket by id with includes', async () => {
      const mockTicket = { id: '1', title: 'Bug' };
      ticketModel.findByPk.mockResolvedValue(mockTicket);

      const result = await service.findOne('1');
      expect(ticketModel.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ include: expect.any(Array) }));
      expect(result).toEqual(mockTicket);
    });
  });

  describe('findByDepartment', () => {
    it('should return tickets for a department', async () => {
      const mockTickets = [{ id: '1', targetDepartmentId: 'dept-1' }];
      ticketModel.findAll.mockResolvedValue(mockTickets);

      const result = await service.findByDepartment('dept-1');
      expect(ticketModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { targetDepartmentId: 'dept-1' } }),
      );
      expect(result).toEqual(mockTickets);
    });
  });

  describe('findByCreator', () => {
    it('should return tickets created by a user', async () => {
      const mockTickets = [{ id: '1', createdById: 'user-1' }];
      ticketModel.findAll.mockResolvedValue(mockTickets);

      const result = await service.findByCreator('user-1');
      expect(ticketModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } }),
      );
      expect(result).toEqual(mockTickets);
    });
  });

  describe('assign', () => {
    it('should set assignedToId and status to ACCEPTED and create a task', async () => {
      const mockTicket = {
        id: '1',
        getDataValue: jest.fn().mockImplementation((key: string) => {
          if (key === 'title') return 'Fix bug';
          if (key === 'description') return 'Broken';
          if (key === 'createdById') return 'user-creator';
          if (key === 'targetDepartmentId') return null;
          return null;
        }),
      };
      const updatedTicket = { id: '1', assignedToId: 'emp-1', status: 'ACCEPTED' };
      ticketModel.findByPk
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(updatedTicket);
      ticketModel.update.mockResolvedValue([1]);
      employeeModel.findByPk.mockResolvedValue({
        getDataValue: jest.fn().mockImplementation((key: string) => {
          if (key === 'firstName') return 'John';
          if (key === 'lastName') return 'Doe';
          return null;
        }),
      });

      const result = await service.assign('1', 'emp-1');

      expect(ticketModel.update).toHaveBeenCalledWith(
        { assignedToId: 'emp-1', status: 'ACCEPTED' },
        { where: { id: '1' } },
      );
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[Ticket] Fix bug',
          assignedToId: 'emp-1',
          state: 'ASSIGNED',
        }),
      );
      expect(result).toEqual(updatedTicket);
    });

    it('should return null if ticket not found', async () => {
      ticketModel.findByPk.mockResolvedValue(null);

      const result = await service.assign('999', 'emp-1');
      expect(result).toBeNull();
      expect(ticketModel.update).not.toHaveBeenCalled();
      expect(tasksService.create).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should set status to CLOSED and closedAt', async () => {
      const updated = [1, [{ id: '1', status: 'CLOSED' }]];
      ticketModel.update.mockResolvedValue(updated);

      const result = await service.close('1');
      expect(ticketModel.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CLOSED', closedAt: expect.any(Date) }),
        { where: { id: '1' }, returning: true },
      );
      expect(result).toEqual(updated);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getEmployeeStats: jest.fn(),
      getLeaderboard: jest.fn(),
      getEmployeeBadges: jest.fn(),
      dismiss: jest.fn(),
      reinstate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [{ provide: EmployeesService, useValue: service }],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  describe('findAll - department scoping', () => {
    it('should pass departmentId query param for MANAGER', async () => {
      const req = { user: { role: 'MANAGER', departmentId: 'manager-dept' } };
      await controller.findAll('dept-query', req);
      expect(service.findAll).toHaveBeenCalledWith('dept-query');
    });

    it('should force own departmentId for HEAD_OF_DEPARTMENT ignoring query param', async () => {
      const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'hod-dept' } };
      await controller.findAll('other-dept', req);
      expect(service.findAll).toHaveBeenCalledWith('hod-dept');
    });

    it('should pass undefined for MANAGER when no departmentId query', async () => {
      const req = { user: { role: 'MANAGER', departmentId: null } };
      await controller.findAll(undefined as any, req);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getLeaderboard', () => {
    it('should call service.getLeaderboard with parsed limit', async () => {
      service.getLeaderboard.mockResolvedValue([{ id: '1', rank: 1, points: 100 }]);
      const result = await controller.getLeaderboard('10');
      expect(service.getLeaderboard).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    it('should default to 5 when no limit provided', async () => {
      service.getLeaderboard.mockResolvedValue([]);
      await controller.getLeaderboard(undefined);
      expect(service.getLeaderboard).toHaveBeenCalledWith(5);
    });
  });

  describe('getStats', () => {
    it('should delegate to service.getEmployeeStats', async () => {
      const mockStats = { weeklyActivity: [], productivityData: [], points: 50 };
      service.getEmployeeStats.mockResolvedValue(mockStats);
      const result = await controller.getStats('emp-1');
      expect(service.getEmployeeStats).toHaveBeenCalledWith('emp-1');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getBadges', () => {
    it('should delegate to service.getEmployeeBadges', async () => {
      const mockBadges = [{ id: 'b1', badgeNumber: 1, title: 'First Steps' }];
      service.getEmployeeBadges.mockResolvedValue(mockBadges);
      const result = await controller.getBadges('emp-1');
      expect(service.getEmployeeBadges).toHaveBeenCalledWith('emp-1');
      expect(result).toEqual(mockBadges);
    });
  });

  describe('dismiss', () => {
    it('should delegate to service.dismiss', async () => {
      const mockEmployee = { id: '1', dismissed: true };
      service.dismiss.mockResolvedValue(mockEmployee);
      const result = await controller.dismiss('1');
      expect(service.dismiss).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('reinstate', () => {
    it('should delegate to service.reinstate', async () => {
      const mockEmployee = { id: '1', dismissed: false };
      service.reinstate.mockResolvedValue(mockEmployee);
      const result = await controller.reinstate('1');
      expect(service.reinstate).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('CRUD endpoints', () => {
    it('create should delegate to service.create', async () => {
      const dto = { email: 'test@test.com', firstName: 'Test' };
      service.create.mockResolvedValue({ id: '1', ...dto });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('id', '1');
    });

    it('findOne should delegate to service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: '1' });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toHaveProperty('id', '1');
    });

    it('update should delegate to service.update', async () => {
      service.update.mockResolvedValue([1, [{ id: '1', firstName: 'Updated' }]]);
      const result = await controller.update('1', { firstName: 'Updated' });
      expect(service.update).toHaveBeenCalledWith('1', { firstName: 'Updated' });
      expect(result).toBeDefined();
    });

    it('remove should delegate to service.remove', async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});

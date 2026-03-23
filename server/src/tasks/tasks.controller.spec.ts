import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByEmployee: jest.fn(),
      findByProject: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  describe('findAll - department scoping', () => {
    it('should pass departmentId query param for MANAGER', async () => {
      const req = { user: { role: 'MANAGER', departmentId: null } };
      await controller.findAll('dept-1', undefined as any, undefined as any, req);
      expect(service.findAll).toHaveBeenCalledWith('dept-1', undefined, undefined);
    });

    it('should force own departmentId for HEAD_OF_DEPARTMENT', async () => {
      const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'hod-dept' } };
      await controller.findAll('other-dept', undefined as any, undefined as any, req);
      expect(service.findAll).toHaveBeenCalledWith('hod-dept', undefined, undefined);
    });
  });

  describe('findMyTasks', () => {
    it('should call findByUserId with the authenticated user id', async () => {
      service.findByUserId.mockResolvedValue([{ id: 't1' }]);
      const req = { user: { userId: 'user-1' } };
      const result = await controller.findMyTasks(req);
      expect(service.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findByProject', () => {
    it('should delegate to service.findByProject', async () => {
      service.findByProject.mockResolvedValue([{ id: 't1', projectId: 'proj-1' }]);
      const result = await controller.findByProject('proj-1');
      expect(service.findByProject).toHaveBeenCalledWith('proj-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findByEmployee', () => {
    it('should delegate to service.findByEmployee', async () => {
      service.findByEmployee.mockResolvedValue([{ id: 't1', assignedToId: 'emp-1' }]);
      const result = await controller.findByEmployee('emp-1');
      expect(service.findByEmployee).toHaveBeenCalledWith('emp-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('CRUD endpoints', () => {
    it('create should delegate to service.create', async () => {
      const dto = { title: 'New Task', state: 'CREATED' };
      service.create.mockResolvedValue({ id: '1', ...dto });
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('id', '1');
    });

    it('findOne should delegate to service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: '1', title: 'Task' });
      const result = await controller.findOne('1');
      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toHaveProperty('id', '1');
    });

    it('update should delegate to service.update', async () => {
      service.update.mockResolvedValue([1, [{ id: '1', state: 'COMPLETED' }]]);
      const result = await controller.update('1', { state: 'COMPLETED' });
      expect(service.update).toHaveBeenCalledWith('1', { state: 'COMPLETED' });
      expect(result).toBeDefined();
    });

    it('remove should delegate to service.remove', async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});

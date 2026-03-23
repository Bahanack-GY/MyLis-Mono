import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [{ provide: DepartmentsService, useValue: service }],
    }).compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
  });

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne with id', async () => {
      await controller.findOne('dept-1');
      expect(service.findOne).toHaveBeenCalledWith('dept-1');
    });
  });

  describe('create', () => {
    it('should delegate to service.create with dto', async () => {
      const dto = { name: 'Engineering', headId: 'emp-1' };
      await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should delegate to service.update with id and dto', async () => {
      const dto = { name: 'New Name', headId: 'emp-2' };
      await controller.update('dept-1', dto);
      expect(service.update).toHaveBeenCalledWith('dept-1', dto);
    });
  });
});

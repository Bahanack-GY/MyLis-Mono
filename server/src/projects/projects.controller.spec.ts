import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Employee } from '../models/employee.model';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findByClient: jest.fn(),
      findByDepartment: jest.fn().mockResolvedValue([]),
      findByDepartmentForEmployee: jest.fn().mockResolvedValue([]),
      findOneForEmployee: jest.fn(),
    };

    employeeModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: service },
        { provide: getModelToken(Employee), useValue: employeeModel },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  describe('findAll - department scoping', () => {
    it('should call findAll when MANAGER provides no departmentId', async () => {
      const req = { user: { role: 'MANAGER', departmentId: null } };
      await controller.findAll(undefined as any, req);
      expect(service.findAll).toHaveBeenCalled();
      expect(service.findByDepartment).not.toHaveBeenCalled();
    });

    it('should call findByDepartment when MANAGER provides departmentId', async () => {
      const req = { user: { role: 'MANAGER', departmentId: null } };
      await controller.findAll('dept-1', req);
      expect(service.findByDepartment).toHaveBeenCalledWith('dept-1');
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('should force own departmentId for HEAD_OF_DEPARTMENT', async () => {
      const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'hod-dept' } };
      await controller.findAll('other-dept', req);
      expect(service.findByDepartment).toHaveBeenCalledWith('hod-dept');
    });
  });
});

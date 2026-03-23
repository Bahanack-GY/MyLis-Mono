import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Employee } from '../models/employee.model';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      findByCreator: jest.fn(),
      findByDepartment: jest.fn().mockResolvedValue([]),
      findByDepartmentAll: jest.fn().mockResolvedValue([]),
      assign: jest.fn(),
      acceptForUser: jest.fn(),
      close: jest.fn(),
    };
    employeeModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: service },
        { provide: getModelToken(Employee), useValue: employeeModel },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
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

  describe('findDepartmentTickets', () => {
    it('should find tickets by employee department', async () => {
      employeeModel.findOne.mockResolvedValue({
        getDataValue: jest.fn().mockReturnValue('dept-1'),
      });
      service.findByDepartmentAll.mockResolvedValue([{ id: 't1' }]);
      const req = { user: { userId: 'user-1' } };
      const result = await controller.findDepartmentTickets(req);
      expect(employeeModel.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(service.findByDepartmentAll).toHaveBeenCalledWith('dept-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when employee not found', async () => {
      employeeModel.findOne.mockResolvedValue(null);
      const req = { user: { userId: 'user-999' } };
      const result = await controller.findDepartmentTickets(req);
      expect(result).toEqual([]);
    });
  });
});

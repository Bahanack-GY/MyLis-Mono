import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DepartmentsService } from './departments.service';
import { Department } from '../models/department.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let departmentModel: Record<string, jest.Mock>;
  let employeeModel: Record<string, jest.Mock>;
  let userModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    departmentModel = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
    };
    employeeModel = {
      findByPk: jest.fn(),
    };
    userModel = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: getModelToken(Department), useValue: departmentModel },
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: getModelToken(User), useValue: userModel },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  describe('create', () => {
    it('should create a department without headId', async () => {
      const dto = { name: 'Engineering', description: 'Tech team' };
      const mockDept = { id: '1', ...dto };
      departmentModel.create.mockResolvedValue(mockDept);

      const result = await service.create(dto);
      expect(departmentModel.create).toHaveBeenCalledWith(dto);
      expect(employeeModel.findByPk).not.toHaveBeenCalled();
      expect(result).toEqual(mockDept);
    });

    it('should create a department and set head role to HEAD_OF_DEPARTMENT', async () => {
      const dto = { name: 'Engineering', headId: 'emp-1' };
      const mockDept = { id: '1', ...dto };
      departmentModel.create.mockResolvedValue(mockDept);
      employeeModel.findByPk.mockResolvedValue({ id: 'emp-1', userId: 'user-1' });
      userModel.update.mockResolvedValue([1]);

      const result = await service.create(dto);
      expect(departmentModel.create).toHaveBeenCalledWith(dto);
      expect(employeeModel.findByPk).toHaveBeenCalledWith('emp-1');
      expect(userModel.update).toHaveBeenCalledWith(
        { role: 'HEAD_OF_DEPARTMENT' },
        { where: { id: 'user-1' } },
      );
      expect(result).toEqual(mockDept);
    });

    it('should not update user role if employee has no userId', async () => {
      const dto = { name: 'Sales', headId: 'emp-2' };
      departmentModel.create.mockResolvedValue({ id: '2', ...dto });
      employeeModel.findByPk.mockResolvedValue({ id: 'emp-2', userId: null });

      await service.create(dto);
      expect(userModel.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return null when department not found', async () => {
      departmentModel.findByPk.mockResolvedValue(null);

      const result = await service.update('999', { name: 'New Name' });
      expect(result).toBeNull();
    });

    it('should update department name without changing head roles', async () => {
      const existingDept = { id: '1', name: 'Old Name', headId: 'emp-1' };
      departmentModel.findByPk
        .mockResolvedValueOnce(existingDept) // first call: find for update
        .mockResolvedValueOnce({ ...existingDept, name: 'New Name' }); // second call: findOne return
      departmentModel.update.mockResolvedValue([1]);

      const result = await service.update('1', { name: 'New Name' });
      expect(departmentModel.update).toHaveBeenCalledWith(
        { name: 'New Name' },
        { where: { id: '1' } },
      );
      expect(employeeModel.findByPk).not.toHaveBeenCalled();
    });

    it('should revert old head role and set new head role when headId changes', async () => {
      const existingDept = { id: '1', name: 'Engineering', headId: 'emp-old' };
      const updatedDept = { id: '1', name: 'Engineering', headId: 'emp-new' };

      departmentModel.findByPk
        .mockResolvedValueOnce(existingDept) // first: find for update
        .mockResolvedValueOnce(updatedDept); // second: findOne after update
      departmentModel.update.mockResolvedValue([1]);

      // Old head employee lookup
      employeeModel.findByPk
        .mockResolvedValueOnce({ id: 'emp-old', userId: 'user-old' })
        .mockResolvedValueOnce({ id: 'emp-new', userId: 'user-new' });
      userModel.update.mockResolvedValue([1]);

      await service.update('1', { headId: 'emp-new' });

      // Should revert old head to EMPLOYEE
      expect(userModel.update).toHaveBeenCalledWith(
        { role: 'EMPLOYEE' },
        { where: { id: 'user-old' } },
      );
      // Should set new head to HEAD_OF_DEPARTMENT
      expect(userModel.update).toHaveBeenCalledWith(
        { role: 'HEAD_OF_DEPARTMENT' },
        { where: { id: 'user-new' } },
      );
    });

    it('should only set new head role when old headId is null', async () => {
      const existingDept = { id: '1', name: 'Sales', headId: null };
      departmentModel.findByPk
        .mockResolvedValueOnce(existingDept)
        .mockResolvedValueOnce({ ...existingDept, headId: 'emp-new' });
      departmentModel.update.mockResolvedValue([1]);
      employeeModel.findByPk.mockResolvedValue({ id: 'emp-new', userId: 'user-new' });
      userModel.update.mockResolvedValue([1]);

      await service.update('1', { headId: 'emp-new' });

      // Should only call update once (for new head), not for old null head
      expect(userModel.update).toHaveBeenCalledTimes(1);
      expect(userModel.update).toHaveBeenCalledWith(
        { role: 'HEAD_OF_DEPARTMENT' },
        { where: { id: 'user-new' } },
      );
    });

    it('should only revert old head role when new headId is null', async () => {
      const existingDept = { id: '1', name: 'Sales', headId: 'emp-old' };
      departmentModel.findByPk
        .mockResolvedValueOnce(existingDept)
        .mockResolvedValueOnce({ ...existingDept, headId: null });
      departmentModel.update.mockResolvedValue([1]);
      employeeModel.findByPk.mockResolvedValue({ id: 'emp-old', userId: 'user-old' });
      userModel.update.mockResolvedValue([1]);

      await service.update('1', { headId: null });

      expect(userModel.update).toHaveBeenCalledTimes(1);
      expect(userModel.update).toHaveBeenCalledWith(
        { role: 'EMPLOYEE' },
        { where: { id: 'user-old' } },
      );
    });

    it('should not change roles when headId is the same', async () => {
      const existingDept = { id: '1', name: 'Sales', headId: 'emp-1' };
      departmentModel.findByPk
        .mockResolvedValueOnce(existingDept)
        .mockResolvedValueOnce(existingDept);
      departmentModel.update.mockResolvedValue([1]);

      await service.update('1', { headId: 'emp-1' });
      expect(employeeModel.findByPk).not.toHaveBeenCalled();
      expect(userModel.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all departments with goals, employees, and head', async () => {
      const mockDepts = [{ id: '1', name: 'Engineering' }];
      departmentModel.findAll.mockResolvedValue(mockDepts);

      const result = await service.findAll();
      expect(departmentModel.findAll).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toEqual(mockDepts);
    });
  });

  describe('findOne', () => {
    it('should find a department by id with goals, employees, and head', async () => {
      const mockDept = { id: '1', name: 'Engineering' };
      departmentModel.findByPk.mockResolvedValue(mockDept);

      const result = await service.findOne('1');
      expect(departmentModel.findByPk).toHaveBeenCalledWith('1', { include: expect.any(Array) });
      expect(result).toEqual(mockDept);
    });
  });
});

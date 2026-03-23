import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/sequelize';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Employee } from '../models/employee.model';
import { Task } from '../models/task.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let employeeModel: Record<string, jest.Mock>;
  let taskModel: Record<string, jest.Mock>;
  let employeeBadgeModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
      findOneById: jest.fn(),
      findOneWithEmployee: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    employeeModel = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    taskModel = {
      count: jest.fn(),
    };
    employeeBadgeModel = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: getModelToken(Employee), useValue: employeeModel },
        { provide: getModelToken(Task), useValue: taskModel },
        { provide: getModelToken(EmployeeBadge), useValue: employeeBadgeModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return user data without passwordHash when credentials are valid', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const mockUser = {
        dataValues: { id: '1', email: 'test@test.com', passwordHash: hash, role: 'EMPLOYEE' },
        passwordHash: hash,
        employee: {
          getDataValue: jest.fn().mockImplementation((key: string) => {
            if (key === 'dismissed') return false;
            if (key === 'departmentId') return 'dept-1';
            return null;
          }),
          departmentId: 'dept-1',
        },
      };
      usersService.findOneWithEmployee!.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@test.com', 'password123');
      expect(result).toEqual({ id: '1', email: 'test@test.com', role: 'EMPLOYEE', departmentId: 'dept-1' });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when password is invalid', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const mockUser = {
        dataValues: { id: '1', email: 'test@test.com', passwordHash: hash, role: 'EMPLOYEE' },
        passwordHash: hash,
        employee: null,
      };
      usersService.findOneWithEmployee!.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@test.com', 'wrong');
      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      usersService.findOneWithEmployee!.mockResolvedValue(null);
      const result = await service.validateUser('nobody@test.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null when employee is dismissed', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const mockUser = {
        dataValues: { id: '1', email: 'test@test.com', passwordHash: hash, role: 'EMPLOYEE' },
        passwordHash: hash,
        employee: {
          getDataValue: jest.fn().mockImplementation((key: string) => {
            if (key === 'dismissed') return true;
            return null;
          }),
        },
      };
      usersService.findOneWithEmployee!.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@test.com', 'password123');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return an access_token and user info with departmentId', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'MANAGER', departmentId: 'dept-1' };
      const result = await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({ email: 'test@test.com', sub: '1', role: 'MANAGER', departmentId: 'dept-1' });
      expect(result).toEqual({
        access_token: 'signed-token',
        user: { id: '1', email: 'test@test.com', role: 'MANAGER', departmentId: 'dept-1' },
      });
    });
  });

  describe('register', () => {
    it('should delegate user creation to UsersService', async () => {
      const dto = { email: 'new@test.com', password: 'pass', role: 'EMPLOYEE' };
      const createdUser = { id: '2', email: 'new@test.com', role: 'EMPLOYEE' };
      usersService.create!.mockResolvedValue(createdUser);

      const result = await service.register(dto);
      expect(usersService.create).toHaveBeenCalledWith({ email: 'new@test.com', password: 'pass', role: 'EMPLOYEE' });
      expect(result).toEqual(createdUser);
    });
  });

  describe('getFullProfile', () => {
    it('should return full profile with points and completedTasksCount', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', role: 'EMPLOYEE' };
      usersService.findOneById!.mockResolvedValue(mockUser);

      const mockEmployee = {
        getDataValue: jest.fn().mockImplementation((key: string) => {
          const values: Record<string, any> = {
            id: 'emp-1',
            departmentId: 'dept-1',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '555-1234',
            avatarUrl: 'http://avatar.com/john.jpg',
            address: '123 Main St',
            birthDate: '1990-01-01',
            hireDate: '2020-06-15',
            skills: ['TypeScript', 'React'],
            educationDocs: [{ name: 'Degree', type: 'PDF' }],
            points: 150,
          };
          return values[key] ?? null;
        }),
        department: { getDataValue: jest.fn().mockReturnValue('Engineering') },
        position: { getDataValue: jest.fn().mockReturnValue('Developer') },
        projects: [{ id: 'p1' }, { id: 'p2' }],
      };
      employeeModel.findOne.mockResolvedValue(mockEmployee);
      taskModel.count.mockResolvedValue(10);

      const result = await service.getFullProfile('user-1');

      expect(usersService.findOneById).toHaveBeenCalledWith('user-1');
      expect(employeeModel.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
      expect(taskModel.count).toHaveBeenCalledWith({ where: { assignedToId: 'emp-1', state: 'COMPLETED' } });

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@test.com',
        role: 'EMPLOYEE',
        departmentId: 'dept-1',
        employeeId: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '555-1234',
        avatarUrl: 'http://avatar.com/john.jpg',
        address: '123 Main St',
        birthDate: '1990-01-01',
        hireDate: '2020-06-15',
        skills: ['TypeScript', 'React'],
        departmentName: 'Engineering',
        positionTitle: 'Developer',
        projectsCount: 2,
        educationDocs: [{ name: 'Degree', type: 'PDF' }],
        points: 150,
        completedTasksCount: 10,
      });
    });

    it('should return null when user not found', async () => {
      usersService.findOneById!.mockResolvedValue(null);
      const result = await service.getFullProfile('nonexistent');
      expect(result).toBeNull();
    });

    it('should return defaults when employee not found', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', role: 'EMPLOYEE' };
      usersService.findOneById!.mockResolvedValue(mockUser);
      employeeModel.findOne.mockResolvedValue(null);

      const result = await service.getFullProfile('user-1');

      expect(result).toEqual(expect.objectContaining({
        userId: 'user-1',
        employeeId: null,
        firstName: '',
        lastName: '',
        points: 0,
        completedTasksCount: 0,
      }));
    });
  });

  describe('getMyBadges', () => {
    it('should return badges for the employee', async () => {
      const mockEmployee = { getDataValue: jest.fn().mockReturnValue('emp-1') };
      employeeModel.findOne.mockResolvedValue(mockEmployee);

      const mockBadges = [
        { id: 'b1', employeeId: 'emp-1', badgeNumber: 1, title: 'First Steps', milestone: 5 },
        { id: 'b2', employeeId: 'emp-1', badgeNumber: 2, title: 'Getting Started', milestone: 10 },
      ];
      employeeBadgeModel.findAll.mockResolvedValue(mockBadges);

      const result = await service.getMyBadges('user-1');

      expect(employeeModel.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(employeeBadgeModel.findAll).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1' },
        order: [['badgeNumber', 'ASC']],
      });
      expect(result).toEqual(mockBadges);
    });

    it('should return empty array when employee not found', async () => {
      employeeModel.findOne.mockResolvedValue(null);
      const result = await service.getMyBadges('user-999');
      expect(result).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    it('should update allowed fields and return full profile', async () => {
      const mockEmployee = { id: 'emp-1' };
      const updatedEmployee = {
        getDataValue: jest.fn().mockImplementation((key: string) => {
          const values: Record<string, any> = {
            id: 'emp-1', departmentId: 'dept-1', firstName: 'Updated',
            lastName: 'Name', phoneNumber: '', avatarUrl: '',
            address: '', birthDate: null, hireDate: null,
            skills: [], educationDocs: [], points: 0,
          };
          return values[key] ?? null;
        }),
        department: { getDataValue: jest.fn().mockReturnValue('') },
        position: { getDataValue: jest.fn().mockReturnValue('') },
        projects: [],
      };
      employeeModel.findOne
        .mockResolvedValueOnce(mockEmployee)
        .mockResolvedValueOnce(updatedEmployee);
      employeeModel.update.mockResolvedValue([1]);
      taskModel.count.mockResolvedValue(0);

      const mockUser = { id: 'user-1', email: 'test@test.com', role: 'EMPLOYEE' };
      usersService.findOneById!.mockResolvedValue(mockUser);

      const result = await service.updateProfile('user-1', { firstName: 'Updated', lastName: 'Name' });

      expect(employeeModel.update).toHaveBeenCalledWith(
        { firstName: 'Updated', lastName: 'Name' },
        { where: { id: 'emp-1' } },
      );
      expect(result).toEqual(expect.objectContaining({ firstName: 'Updated' }));
    });

    it('should return null when employee not found', async () => {
      employeeModel.findOne.mockResolvedValue(null);
      const result = await service.updateProfile('user-999', { firstName: 'Test' });
      expect(result).toBeNull();
    });
  });
});

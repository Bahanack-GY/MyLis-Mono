import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { UsersService } from './users.service';
import { User } from '../models/user.model';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User), useValue: userModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOne', () => {
    it('should find a user by email', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('test@test.com');
      expect(userModel.findOne).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userModel.findOne.mockResolvedValue(null);
      const result = await service.findOne('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findOneById', () => {
    it('should find a user by id', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      userModel.findByPk.mockResolvedValue(mockUser);

      const result = await service.findOneById('1');
      expect(userModel.findByPk).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneWithEmployee', () => {
    it('should find a user by email with Employee include', async () => {
      const mockUser = { id: '1', email: 'test@test.com', employee: { id: 'emp-1', departmentId: 'dept-1' } };
      userModel.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneWithEmployee('test@test.com');
      expect(userModel.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        include: expect.arrayContaining([
          expect.objectContaining({ attributes: ['id', 'departmentId', 'dismissed'] }),
        ]),
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userModel.findOne.mockResolvedValue(null);
      const result = await service.findOneWithEmployee('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should hash the password and create a user', async () => {
      const mockCreated = { id: '1', email: 'test@test.com', role: 'EMPLOYEE' };
      userModel.create.mockResolvedValue(mockCreated);

      const result = await service.create({ email: 'test@test.com', password: 'mypassword' });

      expect(userModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@test.com',
          role: 'EMPLOYEE',
          passwordHash: expect.any(String),
        }),
      );
      const callArgs = userModel.create.mock.calls[0][0];
      expect(callArgs.passwordHash).not.toBe('mypassword');
      expect(result).toEqual(mockCreated);
    });

    it('should use the provided role', async () => {
      userModel.create.mockResolvedValue({ id: '1', email: 'a@b.com', role: 'MANAGER' });

      await service.create({ email: 'a@b.com', password: 'pass', role: 'MANAGER' });
      const callArgs = userModel.create.mock.calls[0][0];
      expect(callArgs.role).toBe('MANAGER');
    });
  });
});

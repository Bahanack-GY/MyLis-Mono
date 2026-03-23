import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;
    let usersService: UsersService;

    const mockAuthService = {
        login: jest.fn(),
        register: jest.fn(),
        getFullProfile: jest.fn(),
        getMyBadges: jest.fn(),
        markFirstLoginDone: jest.fn(),
        updateProfile: jest.fn(),
    };

    const mockUsersService = {
        verifyPassword: jest.fn(),
        changePassword: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: UsersService, useValue: mockUsersService },
            ],
        })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('login', () => {
        it('should return login details', async () => {
            const req = { user: { id: 1, email: 'test@example.com' } };
            mockAuthService.login.mockResolvedValue({ access_token: 'token' });
            const result = await controller.login(req);
            expect(result).toEqual({ access_token: 'token' });
            expect(authService.login).toHaveBeenCalledWith(req.user);
        });
    });

    describe('register', () => {
        it('should call authService.register', async () => {
            const dto = { email: 't@t.com', password: 'pass' };
            mockAuthService.register.mockResolvedValue({ id: 2 } as any);
            const result = await controller.register(dto);
            expect(result).toEqual({ id: 2 });
            expect(authService.register).toHaveBeenCalledWith(dto);
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const req = { user: { userId: 123 } };
            mockAuthService.getFullProfile.mockResolvedValue({ id: 123, name: 'John' });
            const result = await controller.getProfile(req);
            expect(result).toEqual({ id: 123, name: 'John' });
            expect(authService.getFullProfile).toHaveBeenCalledWith(123);
        });
    });

    describe('getMyBadges', () => {
        it('should return user badges', async () => {
            const req = { user: { userId: 123 } };
            mockAuthService.getMyBadges.mockResolvedValue(['Badge1']);
            const result = await controller.getMyBadges(req);
            expect(result).toEqual(['Badge1']);
            expect(authService.getMyBadges).toHaveBeenCalledWith(123);
        });
    });

    describe('markFirstLoginDone', () => {
        it('should mark first login done', async () => {
            const req = { user: { userId: 123 } };
            mockAuthService.markFirstLoginDone.mockResolvedValue(true);
            const result = await controller.markFirstLoginDone(req);
            expect(result).toEqual(true);
            expect(authService.markFirstLoginDone).toHaveBeenCalledWith(123);
        });
    });

    describe('updateProfile', () => {
        it('should update profile', async () => {
            const req = { user: { userId: 123 } };
            const dto = { name: 'New Name' };
            mockAuthService.updateProfile.mockResolvedValue({ id: 123, name: 'New Name' } as any);
            const result = await controller.updateProfile(req, dto);
            expect(result).toEqual({ id: 123, name: 'New Name' });
            expect(authService.updateProfile).toHaveBeenCalledWith(123, dto);
        });
    });

    describe('changePassword', () => {
        it('should throw if currentPassword or newPassword is missing', async () => {
            const req = { user: { userId: 123 } };
            await expect(controller.changePassword(req, { currentPassword: '', newPassword: 'abc' }))
                .rejects.toThrow(BadRequestException);
            await expect(controller.changePassword(req, { currentPassword: 'abc', newPassword: '' }))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw if newPassword is too short', async () => {
            const req = { user: { userId: 123 } };
            await expect(controller.changePassword(req, { currentPassword: 'abc', newPassword: '123' }))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw UnauthorizedException if current password invalid', async () => {
            const req = { user: { userId: 123 } };
            mockUsersService.verifyPassword.mockResolvedValue(false);
            await expect(controller.changePassword(req, { currentPassword: 'wrong', newPassword: 'newpassword' }))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should change password successfully', async () => {
            const req = { user: { userId: 123 } };
            mockUsersService.verifyPassword.mockResolvedValue(true);
            mockUsersService.changePassword.mockResolvedValue(true);
            const result = await controller.changePassword(req, { currentPassword: 'correct', newPassword: 'newpassword' });
            expect(result).toEqual({ message: 'Password changed successfully' });
            expect(usersService.verifyPassword).toHaveBeenCalledWith(123, 'correct');
            expect(usersService.changePassword).toHaveBeenCalledWith(123, 'newpassword');
        });
    });
});

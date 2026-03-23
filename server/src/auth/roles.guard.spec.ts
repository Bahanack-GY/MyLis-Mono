import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (role?: string): ExecutionContext => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getType: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as unknown as ExecutionContext);

  it('should allow when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext('EMPLOYEE'))).toBe(true);
  });

  it('should allow MANAGER when MANAGER is in required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER', 'HEAD_OF_DEPARTMENT']);
    expect(guard.canActivate(mockContext('MANAGER'))).toBe(true);
  });

  it('should allow HEAD_OF_DEPARTMENT when it is in required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER', 'HEAD_OF_DEPARTMENT']);
    expect(guard.canActivate(mockContext('HEAD_OF_DEPARTMENT'))).toBe(true);
  });

  it('should deny EMPLOYEE when only MANAGER and HEAD_OF_DEPARTMENT are allowed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER', 'HEAD_OF_DEPARTMENT']);
    expect(() => guard.canActivate(mockContext('EMPLOYEE'))).toThrow(ForbiddenException);
  });

  it('should deny HEAD_OF_DEPARTMENT when only MANAGER is allowed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER']);
    expect(() => guard.canActivate(mockContext('HEAD_OF_DEPARTMENT'))).toThrow(ForbiddenException);
  });

  it('should deny when no user is present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER']);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

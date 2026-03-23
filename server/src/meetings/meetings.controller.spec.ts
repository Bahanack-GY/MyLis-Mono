import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

describe('MeetingsController', () => {
  let controller: MeetingsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingsController],
      providers: [{ provide: MeetingsService, useValue: service }],
    }).compile();

    controller = module.get<MeetingsController>(MeetingsController);
  });

  describe('findAll - department scoping', () => {
    it('should pass departmentId query param for MANAGER', async () => {
      const req = { user: { role: 'MANAGER', departmentId: null } };
      await controller.findAll('dept-1', req);
      expect(service.findAll).toHaveBeenCalledWith('dept-1');
    });

    it('should force own departmentId for HEAD_OF_DEPARTMENT', async () => {
      const req = { user: { role: 'HEAD_OF_DEPARTMENT', departmentId: 'hod-dept' } };
      await controller.findAll('other-dept', req);
      expect(service.findAll).toHaveBeenCalledWith('hod-dept');
    });
  });
});

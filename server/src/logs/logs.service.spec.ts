import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { LogsService } from './logs.service';
import { Log } from '../models/log.model';

describe('LogsService', () => {
  let service: LogsService;
  let logModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    logModel = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        { provide: getModelToken(Log), useValue: logModel },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
  });

  describe('create', () => {
    it('should create a log entry with action, userId, details, and timestamp', async () => {
      const mockLog = { id: '1', action: 'LOGIN', userId: 'user-1', details: { ip: '127.0.0.1' } };
      logModel.create.mockResolvedValue(mockLog);

      const result = await service.create('LOGIN', 'user-1', { ip: '127.0.0.1' });
      expect(logModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN',
          userId: 'user-1',
          details: { ip: '127.0.0.1' },
          timestamp: expect.any(Date),
        }),
      );
      expect(result).toEqual(mockLog);
    });

    it('should default details to empty object', async () => {
      logModel.create.mockResolvedValue({ id: '1' });

      await service.create('LOGOUT', 'user-1');
      expect(logModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ details: {} }),
      );
    });
  });

  describe('findAll', () => {
    it('should return empty array when no logs', async () => {
      logModel.findAll.mockResolvedValue([]);

      const result = await service.findAll();
      expect(logModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ order: [['timestamp', 'DESC']], limit: 500 }),
      );
      expect(result).toEqual([]);
    });

    it('should return enriched logs when logs exist', async () => {
      const mockLogs = [
        { id: '2', userId: 'user-1', toJSON: () => ({ id: '2', userId: 'user-1', details: {} }) },
        { id: '1', userId: 'user-2', toJSON: () => ({ id: '1', userId: 'user-2', details: {} }) },
      ];
      logModel.findAll.mockResolvedValue(mockLogs);
      logModel.sequelize = { query: jest.fn().mockResolvedValue([[]]) };

      const result = await service.findAll();
      expect(logModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ order: [['timestamp', 'DESC']], limit: 500 }),
      );
      expect(result).toHaveLength(2);
    });
  });
});

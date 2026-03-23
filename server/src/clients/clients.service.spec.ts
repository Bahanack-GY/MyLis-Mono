import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ClientsService } from './clients.service';
import { Client } from '../models/client.model';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientModel: Record<string, jest.Mock>;

  beforeEach(async () => {
    clientModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client), useValue: clientModel },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  describe('findAll', () => {
    it('should return all clients with Project includes', async () => {
      const mockClients = [{ id: '1', name: 'Client A' }];
      clientModel.findAll.mockResolvedValue(mockClients);

      const result = await service.findAll();
      expect(clientModel.findAll).toHaveBeenCalledWith({ include: expect.any(Array) });
      expect(result).toEqual(mockClients);
    });
  });

  describe('findOne', () => {
    it('should find a client by id with includes', async () => {
      const mockClient = { id: '1', name: 'Client A' };
      clientModel.findByPk.mockResolvedValue(mockClient);

      const result = await service.findOne('1');
      expect(clientModel.findByPk).toHaveBeenCalledWith('1', { include: expect.any(Array) });
      expect(result).toEqual(mockClient);
    });

    it('should return null when client not found', async () => {
      clientModel.findByPk.mockResolvedValue(null);
      const result = await service.findOne('999');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a client', async () => {
      const dto = { name: 'New Client', type: 'ONE_TIME', departmentId: 'd-1' };
      const mockClient = { id: '1', ...dto };
      clientModel.create.mockResolvedValue(mockClient);

      const result = await service.create(dto);
      expect(clientModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockClient);
    });
  });

  describe('update', () => {
    it('should update the client', async () => {
      const updated = [1, [{ id: '1', name: 'Updated Client' }]];
      clientModel.update.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'Updated Client' });
      expect(clientModel.update).toHaveBeenCalledWith(
        { name: 'Updated Client' },
        { where: { id: '1' }, returning: true },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should destroy the client when found', async () => {
      const mockClient = { id: '1', destroy: jest.fn() };
      clientModel.findByPk.mockResolvedValue(mockClient);

      await service.remove('1');
      expect(mockClient.destroy).toHaveBeenCalled();
    });

    it('should do nothing when client not found', async () => {
      clientModel.findByPk.mockResolvedValue(null);
      await expect(service.remove('999')).resolves.toBeUndefined();
    });
  });

  describe('findByDepartment', () => {
    it('should return clients for a given department', async () => {
      const mockClients = [{ id: '1', departmentId: 'd-1' }];
      clientModel.findAll.mockResolvedValue(mockClients);

      const result = await service.findByDepartment('d-1');
      expect(clientModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { departmentId: 'd-1' } }),
      );
      expect(result).toEqual(mockClients);
    });
  });
});

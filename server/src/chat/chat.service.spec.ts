import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ChatService } from './chat.service';
import { Channel } from '../models/channel.model';
import { Message } from '../models/message.model';
import { ChannelMember } from '../models/channel-member.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';

describe('ChatService', () => {
    let service: ChatService;

    const mockChannelModel = {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findByPk: jest.fn(),
    };

    const mockMessageModel = {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        findByPk: jest.fn(),
    };

    const mockChannelMemberModel = {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findOrCreate: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        bulkCreate: jest.fn(),
    };

    const mockUserModel = {
        findAll: jest.fn(),
    };

    const mockEmployeeModel = {
        findAll: jest.fn(),
    };

    const mockDepartmentModel = {
        findAll: jest.fn(),
    };

    const mockSequelize = {
        query: jest.fn(),
        transaction: jest.fn((callback) => callback({})),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                { provide: getModelToken(Channel), useValue: mockChannelModel },
                { provide: getModelToken(Message), useValue: mockMessageModel },
                { provide: getModelToken(ChannelMember), useValue: mockChannelMemberModel },
                { provide: getModelToken(User), useValue: mockUserModel },
                { provide: getModelToken(Employee), useValue: mockEmployeeModel },
                { provide: getModelToken(Department), useValue: mockDepartmentModel },
                { provide: Sequelize, useValue: mockSequelize },
            ],
        }).compile();

        service = module.get<ChatService>(ChatService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should alter enums and seed channels', async () => {
            mockSequelize.query.mockResolvedValue(true);
            jest.spyOn(service, 'seedChannels').mockResolvedValue(true as any);
            await service.onModuleInit();
            expect(mockSequelize.query).toHaveBeenCalledTimes(4);
            expect(service.seedChannels).toHaveBeenCalled();
        });
    });

    describe('ensureUserChannels', () => {
        it('should add manager to GENERAL, MANAGERS, and all DEPARTMENT channels', async () => {
            mockChannelModel.findOne.mockImplementation(({ where }) => {
                if (where.type === 'GENERAL') return Promise.resolve({ id: 'gen-id' });
                if (where.type === 'MANAGERS') return Promise.resolve({ id: 'man-id' });
                return Promise.resolve(null);
            });
            mockChannelModel.findAll.mockResolvedValue([{ id: 'dept-id' }]);

            await service.ensureUserChannels('u1', null, 'MANAGER');

            expect(mockChannelMemberModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { channelId: 'gen-id', userId: 'u1' } }));
            expect(mockChannelMemberModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { channelId: 'man-id', userId: 'u1' } }));
            expect(mockChannelMemberModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { channelId: 'dept-id', userId: 'u1' } }));
        });

        it('should add employee to GENERAL and their department channel', async () => {
            mockChannelModel.findOne.mockImplementation(({ where }) => {
                if (where.type === 'GENERAL') return Promise.resolve({ id: 'gen-id' });
                if (where.type === 'DEPARTMENT' && where.departmentId === 'd1') return Promise.resolve({ id: 'd1-id' });
                return Promise.resolve(null);
            });

            await service.ensureUserChannels('u2', 'd1', 'EMPLOYEE');

            expect(mockChannelMemberModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { channelId: 'gen-id', userId: 'u2' } }));
            expect(mockChannelMemberModel.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({ where: { channelId: 'd1-id', userId: 'u2' } }));
        });
    });

    describe('createMessage', () => {
        it('should create message and update channel time inside transaction', async () => {
            mockMessageModel.create.mockResolvedValue({ id: 'm1', channelId: 'c1', content: 'test', senderId: 'u1' });
            mockEmployeeModel.findAll.mockResolvedValue([{ userId: 'u1', firstName: 'John', lastName: 'Doe', avatarUrl: '' }]);

            const result = await service.createMessage('c1', 'u1', 'test');

            expect(mockMessageModel.create).toHaveBeenCalled();
            expect(mockChannelModel.update).toHaveBeenCalledWith(
                { updatedAt: expect.any(Date) },
                expect.any(Object)
            );
            expect(result.id).toBe('m1');
            expect(result.sender.firstName).toBe('John');
        });
    });

    describe('getOrCreateDM', () => {
        it('should return existing DM if found', async () => {
            mockChannelMemberModel.findAll.mockImplementation(({ where }) => {
                if (where.userId === 'u1') return Promise.resolve([{ channelId: 'c1' }]);
                if (where.userId === 'u2') return Promise.resolve([{ channelId: 'c1' }]);
                return Promise.resolve([]);
            });
            mockChannelModel.findOne.mockResolvedValue({ id: 'c1', type: 'DIRECT' });
            mockChannelMemberModel.count.mockResolvedValue(2);

            const result = await service.getOrCreateDM('u1', 'u2');

            expect(result).toEqual({ channel: { id: 'c1', type: 'DIRECT' }, created: false });
        });

        it('should create new DM if not found', async () => {
            mockChannelMemberModel.findAll.mockResolvedValue([]);
            mockChannelModel.create.mockResolvedValue({ id: 'c2', type: 'DIRECT' });

            const result = await service.getOrCreateDM('u1', 'u2');

            expect(mockChannelModel.create).toHaveBeenCalled();
            expect(mockChannelMemberModel.bulkCreate).toHaveBeenCalled();
            expect(result).toEqual({ channel: { id: 'c2', type: 'DIRECT' }, created: true });
        });
    });

    describe('markAsRead', () => {
        it('should update lastReadAt', async () => {
            await service.markAsRead('c1', 'u1');
            expect(mockChannelMemberModel.update).toHaveBeenCalledWith(
                { lastReadAt: expect.any(Date) },
                { where: { channelId: 'c1', userId: 'u1' } }
            );
        });
    });

    describe('getUsers', () => {
        it('should return mapped users', async () => {
            mockEmployeeModel.findAll.mockResolvedValue([{
                getDataValue: (key) => ({ userId: 'u2', firstName: 'Jane' }[key]),
                user: { email: 'jane@test.com' },
                department: { name: 'HR' }
            }]);

            const result = await service.getUsers('u1');
            expect(result).toEqual([{
                userId: 'u2',
                firstName: 'Jane',
                lastName: '',
                avatarUrl: '',
                email: 'jane@test.com',
                departmentName: 'HR'
            }]);
        });
    });

    describe('updateDemandCardStatus', () => {
        it('should return null if message not found', async () => {
            mockMessageModel.findOne.mockResolvedValue(null);
            const result = await service.updateDemandCardStatus('d1', 'APPROVED');
            expect(result).toBeNull();
        });

        it('should parse and update message if found', async () => {
            const mockMsg = {
                id: 'm1',
                channelId: 'c1',
                content: '[DEMAND_CARD:{"demandId":"d1","status":"PENDING"}]'
            };
            mockMessageModel.findOne.mockResolvedValue(mockMsg);

            const result = await service.updateDemandCardStatus('d1', 'APPROVED');

            expect(mockMessageModel.update).toHaveBeenCalledWith(
                { content: '[DEMAND_CARD:{"demandId":"d1","status":"APPROVED"}]' },
                { where: { id: 'm1' } }
            );
            expect(result).toEqual({
                channelId: 'c1',
                messageId: 'm1',
                content: '[DEMAND_CARD:{"demandId":"d1","status":"APPROVED"}]'
            });
        });
    });
});

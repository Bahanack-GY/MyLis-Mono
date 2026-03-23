import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { RolesGuard } from '../auth/roles.guard';
import { ExecutionContext } from '@nestjs/common';

describe('ChatController', () => {
    let controller: ChatController;
    let chatService: ChatService;
    let chatGateway: ChatGateway;

    const mockChatService = {
        getChannelsForUser: jest.fn(),
        getMessages: jest.fn(),
        getChannelMembers: jest.fn(),
        getOrCreateDM: jest.fn(),
        markAsRead: jest.fn(),
        getUsers: jest.fn(),
    };

    const mockChatGateway = {
        joinUserToChannel: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [
                { provide: ChatService, useValue: mockChatService },
                { provide: ChatGateway, useValue: mockChatGateway },
            ],
        })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ChatController>(ChatController);
        chatService = module.get<ChatService>(ChatService);
        chatGateway = module.get<ChatGateway>(ChatGateway);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getChannels', () => {
        it('should return channels for user', async () => {
            const req = { user: { userId: 'u1' } };
            mockChatService.getChannelsForUser.mockResolvedValue([{ id: 'c1' }]);

            const result = await controller.getChannels(req);
            expect(result).toEqual([{ id: 'c1' }]);
            expect(chatService.getChannelsForUser).toHaveBeenCalledWith('u1');
        });
    });

    describe('getMessages', () => {
        it('should return messages', async () => {
            mockChatService.getMessages.mockResolvedValue([{ id: 'm1' }]);
            const result = await controller.getMessages('c1', 'before-id', '10');

            expect(result).toEqual([{ id: 'm1' }]);
            expect(chatService.getMessages).toHaveBeenCalledWith('c1', 'before-id', 10);
        });

        it('should use default limit 50 if limit not provided', async () => {
            mockChatService.getMessages.mockResolvedValue([]);
            const result = await controller.getMessages('c1', undefined, undefined);

            expect(result).toEqual([]);
            expect(chatService.getMessages).toHaveBeenCalledWith('c1', undefined, 50);
        });
    });

    describe('getMembers', () => {
        it('should return channel members', async () => {
            mockChatService.getChannelMembers.mockResolvedValue(['u1', 'u2']);
            const result = await controller.getMembers('c1');

            expect(result).toEqual(['u1', 'u2']);
            expect(chatService.getChannelMembers).toHaveBeenCalledWith('c1');
        });
    });

    describe('createDM', () => {
        it('should create DM, join users to channel, and return channel info', async () => {
            const req = { user: { userId: 'u1' } };
            mockChatService.getOrCreateDM.mockResolvedValue({ channel: { id: 'c1' }, created: true });
            mockChatService.getChannelsForUser.mockResolvedValue([{ id: 'c1', name: 'DM' }]);

            const result = await controller.createDM('u2', req);

            expect(chatService.getOrCreateDM).toHaveBeenCalledWith('u1', 'u2');
            expect(chatGateway.joinUserToChannel).toHaveBeenCalledWith('u1', 'c1');
            expect(chatGateway.joinUserToChannel).toHaveBeenCalledWith('u2', 'c1');
            expect(chatService.getChannelsForUser).toHaveBeenCalledWith('u1');
            expect(result).toEqual({ id: 'c1', name: 'DM' });
        });

        it('should not call joinUserToChannel if channel not created', async () => {
            const req = { user: { userId: 'u1' } };
            mockChatService.getOrCreateDM.mockResolvedValue({ channel: { id: 'c1' }, created: false });
            mockChatService.getChannelsForUser.mockResolvedValue([{ id: 'c1' }]);

            const result = await controller.createDM('u2', req);

            expect(chatGateway.joinUserToChannel).not.toHaveBeenCalled();
            expect(result).toEqual({ id: 'c1' });
        });
    });

    describe('markAsRead', () => {
        it('should mark channel as read', async () => {
            const req = { user: { userId: 'u1' } };
            mockChatService.markAsRead.mockResolvedValue(true);

            const result = await controller.markAsRead('c1', req);
            expect(result).toEqual(true);
            expect(chatService.markAsRead).toHaveBeenCalledWith('c1', 'u1');
        });
    });

    describe('getUsers', () => {
        it('should return users', async () => {
            const req = { user: { userId: 'u1' } };
            mockChatService.getUsers.mockResolvedValue([{ id: 'u2' }]);

            const result = await controller.getUsers(req);
            expect(result).toEqual([{ id: 'u2' }]);
            expect(chatService.getUsers).toHaveBeenCalledWith('u1');
        });
    });

    describe('uploadFiles', () => {
        it('should return formatted file details', () => {
            const files = [
                { originalname: 'test.jpg', filename: '123.jpg', mimetype: 'image/jpeg', size: 1024 } as Express.Multer.File,
            ];
            const result = controller.uploadFiles(files);
            expect(result).toEqual([{
                fileName: 'test.jpg',
                filePath: '/uploads/chat/123.jpg',
                fileType: 'image/jpeg',
                size: 1024,
            }]);
        });

        it('should return empty array if no files', () => {
            const result = controller.uploadFiles(undefined as any);
            expect(result).toEqual([]);
        });
    });
});

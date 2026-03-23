import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtService } from '@nestjs/jwt';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let chatService: ChatService;
    let notificationsService: NotificationsService;
    let jwtService: JwtService;

    const mockChatService = {
        ensureUserChannels: jest.fn(),
        getUserChannelIds: jest.fn(),
        createMessage: jest.fn(),
        getChannel: jest.fn(),
        getChannelMemberUserIds: jest.fn(),
        markAsRead: jest.fn(),
        updateDemandCardStatus: jest.fn(),
    };

    const mockNotificationsService = {
        setPushCallback: jest.fn(),
        createMany: jest.fn(),
    };

    const mockJwtService = {
        verify: jest.fn(),
    };

    const mockServer = {
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        sockets: {
            sockets: new Map(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                { provide: ChatService, useValue: mockChatService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        chatService = module.get<ChatService>(ChatService);
        notificationsService = module.get<NotificationsService>(NotificationsService);
        jwtService = module.get<JwtService>(JwtService);

        gateway.server = mockServer as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('afterInit', () => {
        it('should set push callback for notifications', () => {
            gateway.afterInit();
            expect(notificationsService.setPushCallback).toHaveBeenCalled();
        });
    });

    describe('handleConnection', () => {
        it('should disconnect if no token is provided', async () => {
            const client = { handshake: { auth: {} }, disconnect: jest.fn() } as any;
            await gateway.handleConnection(client);
            expect(client.disconnect).toHaveBeenCalled();
        });

        it('should disconnect on invalid token', async () => {
            const client = { handshake: { auth: { token: 'invalid' } }, disconnect: jest.fn(), emit: jest.fn() } as any;
            mockJwtService.verify.mockImplementation(() => { throw new Error(); });

            await gateway.handleConnection(client);

            expect(client.emit).toHaveBeenCalledWith('connect_error', { message: 'Unauthorized: invalid or expired token' });
            expect(client.disconnect).toHaveBeenCalled();
        });

        it('should authenticate user, set data, and join channels', async () => {
            const client = {
                id: 'socket1',
                handshake: { auth: { token: 'valid' } },
                disconnect: jest.fn(),
                emit: jest.fn(),
                join: jest.fn(),
                data: {}
            } as any;

            mockJwtService.verify.mockReturnValue({ sub: 'user1', email: 'test@test.com', role: 'EMPLOYEE', departmentId: 'dept1' });
            mockChatService.getUserChannelIds.mockResolvedValue(['channel1', 'channel2']);

            await gateway.handleConnection(client);

            expect(client.data.user).toEqual({
                userId: 'user1',
                email: 'test@test.com',
                role: 'EMPLOYEE',
                departmentId: 'dept1',
            });
            expect(chatService.ensureUserChannels).toHaveBeenCalledWith('user1', 'dept1', 'EMPLOYEE');
            expect(client.join).toHaveBeenCalledWith('channel:channel1');
            expect(client.join).toHaveBeenCalledWith('channel:channel2');
            expect(mockServer.emit).toHaveBeenCalledWith('user:online', { userId: 'user1' });
        });
    });

    describe('handleDisconnect', () => {
        it('should handle disconnect and emit user:offline when no sockets left', async () => {
            const client = { id: 'socket1', data: { user: { userId: 'user1', email: 'test' } } } as any;

            // manually set user online with 1 socket
            (gateway as any).onlineUsers.set('user1', new Set(['socket1']));

            await gateway.handleDisconnect(client);

            expect((gateway as any).onlineUsers.has('user1')).toBe(false);
            expect(mockServer.emit).toHaveBeenCalledWith('user:offline', { userId: 'user1' });
        });
    });

    describe('handleMessageSend', () => {
        it('should do nothing if no content or attachments', async () => {
            const client = { data: { user: { userId: 'user1' } } } as any;
            const data = { channelId: 'c1', content: '' };
            await gateway.handleMessageSend(client, data);
            expect(chatService.createMessage).not.toHaveBeenCalled();
        });

        it('should create message, emit, and notify users', async () => {
            const client = { data: { user: { userId: 'user1' } } } as any;
            const data = { channelId: 'c1', content: 'Hello', mentions: ['user2'] };

            mockChatService.createMessage.mockResolvedValue({
                id: 'm1', content: 'Hello', sender: { firstName: 'John', lastName: 'Doe' }
            });
            mockChatService.getChannel.mockResolvedValue({ id: 'c1', name: 'General', type: 'GROUP' });
            mockChatService.getChannelMemberUserIds.mockResolvedValue(['user1', 'user2', 'user3']);

            await gateway.handleMessageSend(client, data);

            expect(chatService.createMessage).toHaveBeenCalledWith('c1', 'user1', 'Hello', null, ['user2'], null);
            expect(mockServer.to).toHaveBeenCalledWith('channel:c1');
            expect(mockServer.emit).toHaveBeenCalledWith('message:new', expect.any(Object));

            expect(notificationsService.createMany).toHaveBeenCalledTimes(2); // one for channel members, one for mentions
        });
    });

    describe('handleMessageRead', () => {
        it('should mark as read and broadcast', async () => {
            const client = { data: { user: { userId: 'user1' } } } as any;
            const data = { channelId: 'c1' };

            await gateway.handleMessageRead(client, data);

            expect(chatService.markAsRead).toHaveBeenCalledWith('c1', 'user1');
            expect(mockServer.to).toHaveBeenCalledWith('channel:c1');
            expect(mockServer.emit).toHaveBeenCalledWith('read:update', expect.any(Object));
        });
    });

    describe('typing start/stop', () => {
        it('should broadcast typing start', () => {
            const client = { data: { user: { userId: 'user1' } }, to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
            gateway.handleTypingStart(client, { channelId: 'c1' });
            expect(client.to).toHaveBeenCalledWith('channel:c1');
            expect(client.emit).toHaveBeenCalledWith('typing', { channelId: 'c1', userId: 'user1' });
        });

        it('should broadcast typing stop', () => {
            const client = { data: { user: { userId: 'user1' } }, to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
            gateway.handleTypingStop(client, { channelId: 'c1' });
            expect(client.to).toHaveBeenCalledWith('channel:c1');
            expect(client.emit).toHaveBeenCalledWith('typing:stop', { channelId: 'c1', userId: 'user1' });
        });
    });
});

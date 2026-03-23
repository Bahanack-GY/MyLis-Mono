import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';

interface SocketUser {
  userId: string;
  email: string;
  role: string;
  departmentId: string | null;
}

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // userId → Set of socketIds
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit() {
    this.notificationsService.setPushCallback((userId, payload) => {
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        for (const socketId of sockets) {
          this.server.to(socketId).emit('notification:push', payload);
        }
      }
    });
  }

  /* ── Connection lifecycle ────────────────────────────── */

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userData: SocketUser = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        departmentId: payload.departmentId,
      };
      client.data.user = userData;

      // Ensure user is in their channels
      await this.chatService.ensureUserChannels(
        userData.userId,
        userData.departmentId,
        userData.role,
      );

      // Join socket rooms for all channels
      const channelIds = await this.chatService.getUserChannelIds(
        userData.userId,
      );
      for (const id of channelIds) {
        client.join(`channel:${id}`);
      }

      // Track online presence
      if (!this.onlineUsers.has(userData.userId)) {
        this.onlineUsers.set(userData.userId, new Set());
      }
      this.onlineUsers.get(userData.userId)!.add(client.id);

      // Broadcast to all: user is online
      this.server.emit('user:online', { userId: userData.userId });

      // Send current online users list to the newly connected client
      const onlineList = Array.from(this.onlineUsers.keys());
      client.emit('users:online', onlineList);

      this.logger.log(`Client connected: ${userData.email} (${client.id})`);
    } catch {
      client.emit('connect_error', { message: 'Unauthorized: invalid or expired token' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return;

    const sockets = this.onlineUsers.get(user.userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.onlineUsers.delete(user.userId);
        // Broadcast: user went offline
        this.server.emit('user:offline', { userId: user.userId });
      }
    }

    this.logger.log(`Client disconnected: ${user.email} (${client.id})`);
  }

  /* ── Message events ──────────────────────────────────── */

  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      channelId: string;
      content: string;
      replyToId?: string;
      mentions?: string[];
      attachments?: {
        fileName: string;
        filePath: string;
        fileType: string;
        size: number;
      }[];
    },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data.channelId) return;

    const hasContent = data.content?.trim();
    const hasAttachments = data.attachments && data.attachments.length > 0;
    if (!hasContent && !hasAttachments) return;

    const message = await this.chatService.createMessage(
      data.channelId,
      user.userId,
      data.content?.trim() || '',
      data.replyToId || null,
      data.mentions || null,
      data.attachments || null,
    );

    // Broadcast to all members in the channel room
    this.server.to(`channel:${data.channelId}`).emit('message:new', message);

    // Send message notification to all other channel members (not the sender)
    const senderName =
      `${message.sender.firstName} ${message.sender.lastName}`.trim() ||
      'Someone';
    const preview =
      message.content.length > 80
        ? message.content.substring(0, 80) + '...'
        : message.content;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const channel = await this.chatService.getChannel(data.channelId);
    const memberUserIds = await this.chatService.getChannelMemberUserIds(
      data.channelId,
    );
    const otherMembers = memberUserIds.filter((id) => id !== user.userId);

    const isDirect = channel?.type === 'DIRECT';
    const notifTitle = isDirect
      ? `New private message from ${senderName}`
      : `New message in ${channel?.name ?? 'a channel'} from ${senderName}`;
    const notifTitleFr = isDirect
      ? `Nouveau message privé de ${senderName}`
      : `Nouveau message dans ${channel?.name ?? 'un canal'} de ${senderName}`;

    if (otherMembers.length > 0) {
      await this.notificationsService.createMany(
        otherMembers.map((userId) => ({
          title: notifTitle,
          body: preview || 'Sent an attachment',
          titleFr: notifTitleFr,
          bodyFr: preview || 'A envoyé une pièce jointe',
          type: 'message',
          userId,
          meta: { channelId: data.channelId },
        })),
      );
    }

    // Send mention notifications (additional emphasis)
    if (data.mentions && data.mentions.length > 0) {
      const recipients = data.mentions.filter((id) => id !== user.userId);
      if (recipients.length > 0) {
        await this.notificationsService.createMany(
          recipients.map((userId) => ({
            title: `${senderName} mentioned you`,
            body: preview,
            titleFr: `${senderName} vous a mentionné(e)`,
            bodyFr: preview,
            type: 'chat',
            userId,
            meta: { channelId: data.channelId },
          })),
        );
      }
    }

    return message;
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data.channelId) return;

    await this.chatService.markAsRead(data.channelId, user.userId);

    // Broadcast read update to channel members
    this.server.to(`channel:${data.channelId}`).emit('read:update', {
      channelId: data.channelId,
      userId: user.userId,
      lastReadAt: new Date().toISOString(),
    });
  }

  /* ── Typing events ───────────────────────────────────── */

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data.channelId) return;

    client.to(`channel:${data.channelId}`).emit('typing', {
      channelId: data.channelId,
      userId: user.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data.channelId) return;

    client.to(`channel:${data.channelId}`).emit('typing:stop', {
      channelId: data.channelId,
      userId: user.userId,
    });
  }

  /* ── Demand status update ────────────────────────────── */

  @SubscribeMessage('demand:statusUpdate')
  async handleDemandStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { demandId: string; status: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data.demandId || !data.status) return;

    const result = await this.chatService.updateDemandCardStatus(
      data.demandId,
      data.status,
    );
    if (result) {
      // Broadcast the updated message to all channel members
      this.server.to(`channel:${result.channelId}`).emit('message:updated', {
        messageId: result.messageId,
        channelId: result.channelId,
        content: result.content,
      });
    }
  }

  /* ── Channel join (for new DMs) ──────────────────────── */

  @SubscribeMessage('channel:join')
  async handleChannelJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data.channelId) return;

    // Only allow joining rooms the user is actually a member of
    const memberIds = await this.chatService.getChannelMemberUserIds(data.channelId);
    if (!memberIds.includes(user.userId)) return;

    client.join(`channel:${data.channelId}`);
  }

  /* ── Helper: join a user to a room across all their sockets ── */

  joinUserToChannel(userId: string, channelId: string) {
    const sockets = this.onlineUsers.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`channel:${channelId}`);
        }
      }
    }
  }
}

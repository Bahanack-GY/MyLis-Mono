import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Channel } from '../models/channel.model';
import { Message } from '../models/message.model';
import { ChannelMember } from '../models/channel-member.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Channel) private channelModel: typeof Channel,
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(ChannelMember)
    private channelMemberModel: typeof ChannelMember,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Employee) private employeeModel: typeof Employee,
    @InjectModel(Department) private departmentModel: typeof Department,
    private sequelize: Sequelize,
  ) {}

  async onModuleInit() {
    // Ensure MANAGERS enum value exists (PostgreSQL ENUMs need explicit ALTER)
    try {
      await this.sequelize.query(
        `ALTER TYPE "enum_Channels_type" ADD VALUE IF NOT EXISTS 'MANAGERS'`,
      );
    } catch {
      // Ignore if already exists or not PostgreSQL
    }
    try {
      await this.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE IF NOT EXISTS 'chat'`,
      );
    } catch {
      // Ignore if already exists or not PostgreSQL
    }
    try {
      await this.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE IF NOT EXISTS 'demand'`,
      );
    } catch {
      // Ignore
    }
    try {
      await this.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE IF NOT EXISTS 'message'`,
      );
    } catch {
      // Ignore
    }
    await this.seedChannels();
  }

  /* ── Helper: fetch employee info by userId(s) ─────────── */

  private async getEmployeeMap(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, any>();
    const employees = await this.employeeModel.findAll({
      where: { userId: { [Op.in]: userIds } },
      attributes: ['userId', 'firstName', 'lastName', 'avatarUrl'],
      raw: true,
    });
    return new Map((employees as any[]).map((e) => [e.userId, e]));
  }

  private empToInfo(emp: any) {
    return {
      firstName: emp?.firstName || '',
      lastName: emp?.lastName || '',
      avatarUrl: emp?.avatarUrl || '',
    };
  }

  /* ── Seeding ─────────────────────────────────────────── */

  async seedChannels() {
    // Create General channel if not exists
    let general = await this.channelModel.findOne({
      where: { type: 'GENERAL' },
    });
    if (!general) {
      general = await this.channelModel.create({
        name: 'General',
        type: 'GENERAL',
        description: 'General discussion for everyone',
      });
      this.logger.log('Created General channel');
    }

    // Add all users to General
    const allUsers = await this.userModel.findAll({ attributes: ['id'] });
    for (const user of allUsers) {
      await this.channelMemberModel.findOrCreate({
        where: { channelId: general.id, userId: user.id },
        defaults: { channelId: general.id, userId: user.id },
      });
    }

    // Create department channels
    const departments = await this.departmentModel.findAll({
      include: [{ model: Employee, as: 'employees', attributes: ['userId'] }],
    });

    for (const dept of departments) {
      let channel = await this.channelModel.findOne({
        where: { type: 'DEPARTMENT', departmentId: dept.id },
      });
      if (!channel) {
        channel = await this.channelModel.create({
          name: dept.getDataValue('name'),
          type: 'DEPARTMENT',
          departmentId: dept.id,
          description: `Channel for ${dept.getDataValue('name')} department`,
        });
        this.logger.log(
          `Created department channel: ${dept.getDataValue('name')}`,
        );
      }

      // Add department employees
      const employees = dept.employees || [];
      for (const emp of employees) {
        const userId = emp.getDataValue('userId');
        if (userId) {
          await this.channelMemberModel.findOrCreate({
            where: { channelId: channel.id, userId },
            defaults: { channelId: channel.id, userId },
          });
        }
      }
    }

    // Create Managers channel and add all managers
    const managers = await this.userModel.findAll({
      where: { role: 'MANAGER' },
      attributes: ['id'],
    });

    let managersChannel = await this.channelModel.findOne({
      where: { type: 'MANAGERS' },
    });
    if (!managersChannel) {
      managersChannel = await this.channelModel.create({
        name: 'Managers',
        type: 'MANAGERS',
        description: 'Private channel for managers',
      });
      this.logger.log('Created Managers channel');
    }

    for (const manager of managers) {
      await this.channelMemberModel.findOrCreate({
        where: { channelId: managersChannel.id, userId: manager.id },
        defaults: { channelId: managersChannel.id, userId: manager.id },
      });
    }

    // Add all managers to every department channel
    const deptChannels = await this.channelModel.findAll({
      where: { type: 'DEPARTMENT' },
      attributes: ['id'],
    });
    for (const manager of managers) {
      for (const ch of deptChannels) {
        await this.channelMemberModel.findOrCreate({
          where: { channelId: ch.id, userId: manager.id },
          defaults: { channelId: ch.id, userId: manager.id },
        });
      }
    }

    this.logger.log('Channel seeding complete');
  }

  /* ── Ensure user membership ──────────────────────────── */

  async ensureUserChannels(
    userId: string,
    departmentId?: string | null,
    role?: string,
  ) {
    // Add to General
    const general = await this.channelModel.findOne({
      where: { type: 'GENERAL' },
    });
    if (general) {
      await this.channelMemberModel.findOrCreate({
        where: { channelId: general.id, userId },
        defaults: { channelId: general.id, userId },
      });
    }

    // Managers get access to Managers channel + all department channels
    if (role === 'MANAGER') {
      const managersChannel = await this.channelModel.findOne({
        where: { type: 'MANAGERS' },
      });
      if (managersChannel) {
        await this.channelMemberModel.findOrCreate({
          where: { channelId: managersChannel.id, userId },
          defaults: { channelId: managersChannel.id, userId },
        });
      }

      const allDeptChannels = await this.channelModel.findAll({
        where: { type: 'DEPARTMENT' },
        attributes: ['id'],
      });
      for (const ch of allDeptChannels) {
        await this.channelMemberModel.findOrCreate({
          where: { channelId: ch.id, userId },
          defaults: { channelId: ch.id, userId },
        });
      }
    } else if (departmentId) {
      // Non-managers: add to their own department channel only
      const deptChannel = await this.channelModel.findOne({
        where: { type: 'DEPARTMENT', departmentId },
      });
      if (deptChannel) {
        await this.channelMemberModel.findOrCreate({
          where: { channelId: deptChannel.id, userId },
          defaults: { channelId: deptChannel.id, userId },
        });
      }
    }
  }

  /* ── Channels ────────────────────────────────────────── */

  async getChannelsForUser(userId: string) {
    const memberships = await this.channelMemberModel.findAll({
      where: { userId },
      attributes: ['channelId', 'lastReadAt'],
    });

    const channelIds = memberships.map((m) => m.channelId);
    if (channelIds.length === 0) return [];

    const membershipMap = new Map(memberships.map((m) => [m.channelId, m]));

    const channels = await this.channelModel.findAll({
      where: { id: { [Op.in]: channelIds } },
      include: [{ model: Department, attributes: ['id', 'name'] }],
      order: [['updatedAt', 'DESC']],
    });

    const directChannelIds = channels.filter((c) => c.type === 'DIRECT').map((c) => c.id);

    // Fire all per-channel queries in parallel
    const [lastMessagesResults, unreadCountsResults, dmMembershipsResults] =
      await Promise.all([
        Promise.all(
          channelIds.map((channelId) =>
            this.messageModel
              .findOne({
                where: { channelId },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'content', 'createdAt', 'senderId'],
              })
              .then((msg) => ({ channelId, msg })),
          ),
        ),
        Promise.all(
          memberships.map((m) => {
            const where: any = { channelId: m.channelId };
            if (m.lastReadAt) where.createdAt = { [Op.gt]: m.lastReadAt };
            return this.messageModel
              .count({ where })
              .then((count) => ({ channelId: m.channelId, count }));
          }),
        ),
        Promise.all(
          directChannelIds.map((channelId) =>
            this.channelMemberModel
              .findOne({
                where: { channelId, userId: { [Op.ne]: userId } },
                attributes: ['channelId', 'userId'],
              })
              .then((membership) => ({ channelId, membership })),
          ),
        ),
      ]);

    const lastMessageMap = new Map(lastMessagesResults.map((r) => [r.channelId, r.msg]));
    const unreadCountMap = new Map(unreadCountsResults.map((r) => [r.channelId, r.count]));
    const dmMembershipMap = new Map(dmMembershipsResults.map((r) => [r.channelId, r.membership]));

    // Batch all employee lookups into a single query
    const allUserIds = new Set<string>();
    for (const { msg } of lastMessagesResults) {
      if (msg) allUserIds.add(msg.senderId);
    }
    for (const { membership } of dmMembershipsResults) {
      if (membership) allUserIds.add(membership.userId);
    }
    const empMap = await this.getEmployeeMap([...allUserIds]);

    const result: any[] = channels.map((channel) => {
      const lastMessage = lastMessageMap.get(channel.id);
      const unreadCount = unreadCountMap.get(channel.id) ?? 0;

      let lastMessageInfo: any = null;
      if (lastMessage) {
        const emp = empMap.get(lastMessage.senderId);
        const info = this.empToInfo(emp);
        lastMessageInfo = {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          senderName: `${info.firstName} ${info.lastName}`.trim() || 'Unknown',
        };
      }

      let dmUser: any = null;
      if (channel.type === 'DIRECT') {
        const otherMembership = dmMembershipMap.get(channel.id);
        if (otherMembership) {
          const emp = empMap.get(otherMembership.userId);
          const info = this.empToInfo(emp);
          dmUser = { userId: otherMembership.userId, ...info };
        }
      }

      return {
        id: channel.id,
        name:
          channel.type === 'DIRECT' && dmUser
            ? `${dmUser.firstName} ${dmUser.lastName}`.trim() || 'DM'
            : channel.name,
        type: channel.type,
        departmentId: channel.departmentId,
        description: channel.description,
        unreadCount,
        dmUser,
        lastMessage: lastMessageInfo,
      };
    });

    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      return bTime - aTime;
    });

    return result;
  }

  /* ── Messages ────────────────────────────────────────── */

  async getMessages(channelId: string, before?: string, limit = 50) {
    const where: any = { channelId };
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await this.messageModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
    });

    // Fetch all sender employee data in one query
    const senderIds = [...new Set(messages.map((m) => m.senderId))];

    // Collect replyToIds and batch-fetch original messages
    const replyToIds = [
      ...new Set(messages.map((m) => m.replyToId).filter(Boolean)),
    ] as string[];

    let replyMap = new Map<string, any>();
    if (replyToIds.length > 0) {
      const replyMessages = await this.messageModel.findAll({
        where: { id: { [Op.in]: replyToIds } },
      });
      const replySenderIds = [...new Set(replyMessages.map((m) => m.senderId))];
      const replyEmpMap = await this.getEmployeeMap(replySenderIds);

      for (const rm of replyMessages) {
        const emp = replyEmpMap.get(rm.senderId);
        const info = this.empToInfo(emp);
        replyMap.set(rm.id, {
          id: rm.id,
          content: rm.content,
          sender: {
            id: rm.senderId,
            firstName: info.firstName,
            lastName: info.lastName,
          },
        });
      }
    }

    const empMap = await this.getEmployeeMap(senderIds);

    return messages.reverse().map((msg) => {
      const emp = empMap.get(msg.senderId);
      const info = this.empToInfo(emp);
      return {
        id: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        createdAt: msg.createdAt,
        replyTo: msg.replyToId ? replyMap.get(msg.replyToId) || null : null,
        mentions: msg.mentions || null,
        attachments: msg.attachments || null,
        sender: {
          id: msg.senderId,
          ...info,
        },
      };
    });
  }

  async createMessage(
    channelId: string,
    senderId: string,
    content: string,
    replyToId?: string | null,
    mentions?: string[] | null,
    attachments?:
      | { fileName: string; filePath: string; fileType: string; size: number }[]
      | null,
  ) {
    const message = await this.sequelize.transaction(async (t) => {
      const msg = await this.messageModel.create({
        channelId,
        senderId,
        content,
        replyToId: replyToId || null,
        mentions: mentions && mentions.length > 0 ? mentions : null,
        attachments: attachments && attachments.length > 0 ? attachments : null,
      }, { transaction: t });

      // Update channel's updatedAt atomically with message creation
      await this.channelModel.update(
        { updatedAt: new Date() },
        { where: { id: channelId }, transaction: t },
      );

      return msg;
    });

    // Fetch sender employee info
    const empMap = await this.getEmployeeMap([senderId]);
    const emp = empMap.get(senderId);
    const info = this.empToInfo(emp);

    // Fetch replyTo message snippet if applicable
    let replyToData: any = null;
    if (replyToId) {
      const originalMsg = await this.messageModel.findByPk(replyToId);
      if (originalMsg) {
        const replyEmpMap = await this.getEmployeeMap([originalMsg.senderId]);
        const replyEmp = replyEmpMap.get(originalMsg.senderId);
        const replyInfo = this.empToInfo(replyEmp);
        replyToData = {
          id: originalMsg.id,
          content: originalMsg.content,
          sender: {
            id: originalMsg.senderId,
            firstName: replyInfo.firstName,
            lastName: replyInfo.lastName,
          },
        };
      }
    }

    return {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      createdAt: message.createdAt,
      replyTo: replyToData,
      mentions: message.mentions || null,
      attachments: message.attachments || null,
      sender: {
        id: senderId,
        ...info,
      },
    };
  }

  /* ── Direct Messages ─────────────────────────────────── */

  async getOrCreateDM(
    userId: string,
    targetUserId: string,
  ): Promise<{ channel: Channel; created: boolean }> {
    // Find existing DM channel where both users are members
    const userChannels = await this.channelMemberModel.findAll({
      where: { userId },
      attributes: ['channelId'],
    });
    const userChannelIds = userChannels.map((m) => m.channelId);

    if (userChannelIds.length > 0) {
      const targetInSameChannels = await this.channelMemberModel.findAll({
        where: {
          userId: targetUserId,
          channelId: { [Op.in]: userChannelIds },
        },
        attributes: ['channelId'],
      });

      for (const tm of targetInSameChannels) {
        const channel = await this.channelModel.findOne({
          where: { id: tm.channelId, type: 'DIRECT' },
        });
        if (channel) {
          // Verify it's a 2-person DM (not a group)
          const memberCount = await this.channelMemberModel.count({
            where: { channelId: channel.id },
          });
          if (memberCount === 2) {
            return { channel, created: false };
          }
        }
      }
    }

    // Create new DM channel atomically
    const channel = await this.sequelize.transaction(async (t) => {
      const ch = await this.channelModel.create({
        name: `DM`,
        type: 'DIRECT',
        createdById: userId,
      }, { transaction: t });

      await this.channelMemberModel.bulkCreate([
        { channelId: ch.id, userId },
        { channelId: ch.id, userId: targetUserId },
      ], { transaction: t });

      return ch;
    });

    return { channel, created: true };
  }

  /* ── Read Receipts ───────────────────────────────────── */

  async markAsRead(channelId: string, userId: string) {
    await this.channelMemberModel.update(
      { lastReadAt: new Date() },
      { where: { channelId, userId } },
    );
  }

  async getChannelMembers(channelId: string) {
    const members = await this.channelMemberModel.findAll({
      where: { channelId },
      attributes: ['userId', 'lastReadAt'],
    });

    const userIds = members.map((m) => m.userId);
    const empMap = await this.getEmployeeMap(userIds);

    return members.map((m) => {
      const emp = empMap.get(m.userId);
      const info = this.empToInfo(emp);
      return {
        userId: m.userId,
        ...info,
        lastReadAt: m.lastReadAt,
      };
    });
  }

  /* ── Users for DM picker ─────────────────────────────── */

  async getUsers(excludeUserId: string) {
    const employees = await this.employeeModel.findAll({
      where: { userId: { [Op.ne]: excludeUserId } },
      attributes: ['userId', 'firstName', 'lastName', 'avatarUrl'],
      include: [
        { model: User, attributes: ['id', 'email'] },
        { model: Department, attributes: ['name'] },
      ],
    });

    return employees.map((emp) => ({
      userId: emp.getDataValue('userId'),
      firstName: emp.getDataValue('firstName') || '',
      lastName: emp.getDataValue('lastName') || '',
      avatarUrl: emp.getDataValue('avatarUrl') || '',
      email: (emp.user as any)?.email || '',
      departmentName: (emp.department as any)?.name || '',
    }));
  }

  /* ── Helpers ──────────────────────────────────────────── */

  async updateDemandCardStatus(
    demandId: string,
    newStatus: string,
  ): Promise<{ channelId: string; messageId: string; content: string } | null> {
    // Find the message containing this demand card
    const message = await this.messageModel.findOne({
      where: {
        content: { [Op.like]: `%"demandId":"${demandId}"%` },
      },
    });

    if (!message) return null;

    // Parse and update the demand card status in the message content
    const match = message.content.match(/^\[DEMAND_CARD:(.+)\]$/s);
    if (!match) return null;

    try {
      const cardData = JSON.parse(match[1]);
      cardData.status = newStatus;
      const updatedContent = `[DEMAND_CARD:${JSON.stringify(cardData)}]`;

      await this.messageModel.update(
        { content: updatedContent },
        { where: { id: message.id } },
      );

      return {
        channelId: message.channelId,
        messageId: message.id,
        content: updatedContent,
      };
    } catch {
      return null;
    }
  }

  async getUserChannelIds(userId: string): Promise<string[]> {
    const memberships = await this.channelMemberModel.findAll({
      where: { userId },
      attributes: ['channelId'],
    });
    return memberships.map((m) => m.channelId);
  }

  async getChannelMemberUserIds(channelId: string): Promise<string[]> {
    const members = await this.channelMemberModel.findAll({
      where: { channelId },
      attributes: ['userId'],
    });
    return members.map((m) => m.userId);
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    return (await this.channelModel.findByPk(channelId)) ?? null;
  }
}

export interface Channel {
    id: string;
    name: string;
    type: 'GENERAL' | 'DEPARTMENT' | 'DIRECT' | 'MANAGERS';
    departmentId?: string;
    description?: string;
    unreadCount: number;
    dmUser?: {
        userId: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    };
    lastMessage?: {
        content: string;
        createdAt: string;
        senderName: string;
    };
}

export interface ChatAttachment {
    fileName: string;
    filePath: string;
    fileType: string;
    size: number;
}

export interface ChatMessage {
    id: string;
    channelId: string;
    content: string;
    createdAt: string;
    sender: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    };
    replyTo?: {
        id: string;
        content: string;
        sender: { id: string; firstName: string; lastName: string };
    } | null;
    mentions?: string[] | null;
    attachments?: ChatAttachment[] | null;
}

export interface ChannelMember {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    lastReadAt: string;
}

export interface ChatUser {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
    departmentName?: string;
}

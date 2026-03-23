import api from '../config';
import type { Channel, ChatMessage, ChatAttachment, ChannelMember, ChatUser } from './types';

export const chatApi = {
    getChannels: () =>
        api.get<Channel[]>('/chat/channels').then(r => r.data),

    getMessages: (channelId: string, before?: string, limit = 50) =>
        api.get<ChatMessage[]>(`/chat/channels/${channelId}/messages`, {
            params: { before, limit },
        }).then(r => r.data),

    getMembers: (channelId: string) =>
        api.get<ChannelMember[]>(`/chat/channels/${channelId}/members`).then(r => r.data),

    createDM: (targetUserId: string) =>
        api.post<Channel>(`/chat/channels/direct/${targetUserId}`).then(r => r.data),

    markAsRead: (channelId: string) =>
        api.patch(`/chat/channels/${channelId}/read`).then(r => r.data),

    getUsers: () =>
        api.get<ChatUser[]>('/chat/users').then(r => r.data),

    uploadFiles: (files: File[]) => {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        return api.post<ChatAttachment[]>('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
    },
};

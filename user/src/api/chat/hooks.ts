import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { chatApi } from './api';
import type { ChatMessage, ChatAttachment, Channel } from './types';

export const useChannels = () => {
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    const query = useQuery({
        queryKey: ['chat', 'channels'],
        queryFn: chatApi.getChannels,
    });

    useEffect(() => {
        if (!socket) return;

        // Update only the affected channel in the cache instead of refetching all channels.
        // This avoids N API calls when N messages arrive and keeps the sidebar instant.
        const handleNewMessage = (message: ChatMessage) => {
            queryClient.setQueryData(
                ['chat', 'channels'],
                (old: Channel[] | undefined) => {
                    if (!old) return old;
                    return old
                        .map(c => c.id !== message.channelId ? c : {
                            ...c,
                            lastMessage: {
                                content: message.content,
                                createdAt: message.createdAt,
                                senderName: `${message.sender.firstName} ${message.sender.lastName}`.trim() || 'Unknown',
                            },
                            unreadCount: c.unreadCount + 1,
                        })
                        .sort((a, b) => {
                            const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
                            const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
                            return bTime - aTime;
                        });
                },
            );
        };

        socket.on('message:new', handleNewMessage);
        return () => { socket.off('message:new', handleNewMessage); };
    }, [socket, queryClient]);

    return query;
};

export const useMessages = (channelId: string | null) => {
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    const query = useQuery({
        queryKey: ['chat', 'messages', channelId],
        queryFn: () => chatApi.getMessages(channelId!),
        enabled: !!channelId,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (!socket || !channelId) return;

        const handleNewMessage = (message: ChatMessage) => {
            if (message.channelId !== channelId) return;

            queryClient.setQueryData(
                ['chat', 'messages', channelId],
                (old: ChatMessage[] | undefined) => {
                    if (!old) return [message];
                    if (old.some(m => m.id === message.id)) return old;
                    return [...old, message];
                },
            );
        };

        // Listen for message content updates (e.g. demand card status changes)
        const handleMessageUpdated = (data: { messageId: string; channelId: string; content: string }) => {
            if (data.channelId !== channelId) return;

            queryClient.setQueryData(
                ['chat', 'messages', channelId],
                (old: ChatMessage[] | undefined) => {
                    if (!old) return old;
                    return old.map(m =>
                        m.id === data.messageId ? { ...m, content: data.content } : m,
                    );
                },
            );
        };

        socket.on('message:new', handleNewMessage);
        socket.on('message:updated', handleMessageUpdated);
        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('message:updated', handleMessageUpdated);
        };
    }, [socket, channelId, queryClient]);

    return query;
};

export const useLoadMoreMessages = (channelId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (before: string) => chatApi.getMessages(channelId!, before),
        onSuccess: (olderMessages) => {
            queryClient.setQueryData(
                ['chat', 'messages', channelId],
                (old: ChatMessage[] | undefined) => {
                    if (!old) return olderMessages;
                    const existingIds = new Set(old.map(m => m.id));
                    const newOnes = olderMessages.filter(m => !existingIds.has(m.id));
                    return [...newOnes, ...old];
                },
            );
        },
    });
};

export const useSendMessage = () => {
    const { socket } = useSocket();
    const queryClient = useQueryClient();

    return useCallback((channelId: string, content: string, replyToId?: string, mentions?: string[], attachments?: ChatAttachment[]) => {
        if (!socket) return;
        socket.emit('message:send', {
            channelId,
            content,
            ...(replyToId && { replyToId }),
            ...(mentions && mentions.length > 0 && { mentions }),
            ...(attachments && attachments.length > 0 && { attachments }),
        }, (message: ChatMessage) => {
            // ACK: server confirmed the message — add it to the cache immediately
            if (!message) return;
            queryClient.setQueryData(
                ['chat', 'messages', channelId],
                (old: ChatMessage[] | undefined) => {
                    if (!old) return [message];
                    if (old.some(m => m.id === message.id)) return old;
                    return [...old, message];
                },
            );
        });
    }, [socket, queryClient]);
};

export const useUploadFiles = () => {
    return useMutation({
        mutationFn: (files: File[]) => chatApi.uploadFiles(files),
    });
};

export const useMarkAsRead = () => {
    const { socket } = useSocket();
    const queryClient = useQueryClient();

    return useCallback((channelId: string) => {
        if (!socket) return;
        socket.emit('message:read', { channelId });
        queryClient.setQueryData(
            ['chat', 'channels'],
            (old: Channel[] | undefined) => {
                if (!old) return old;
                return old.map(c =>
                    c.id === channelId ? { ...c, unreadCount: 0 } : c,
                );
            },
        );
    }, [socket, queryClient]);
};

export const useTyping = (channelId: string | null) => {
    const { socket } = useSocket();
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const startTyping = useCallback(() => {
        if (!socket || !channelId) return;
        socket.emit('typing:start', { channelId });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { channelId });
        }, 3000);
    }, [socket, channelId]);

    const stopTyping = useCallback(() => {
        if (!socket || !channelId) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        socket.emit('typing:stop', { channelId });
    }, [socket, channelId]);

    return { startTyping, stopTyping };
};

export const useMembers = (channelId: string | null) => {
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    const query = useQuery({
        queryKey: ['chat', 'members', channelId],
        queryFn: () => chatApi.getMembers(channelId!),
        enabled: !!channelId,
    });

    useEffect(() => {
        if (!socket || !channelId) return;

        const handleReadUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'members', channelId] });
        };

        socket.on('read:update', handleReadUpdate);
        return () => { socket.off('read:update', handleReadUpdate); };
    }, [socket, channelId, queryClient]);

    return query;
};

export const useCreateDM = () => {
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    return useMutation({
        mutationFn: (targetUserId: string) => chatApi.createDM(targetUserId),
        onSuccess: (channel) => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
            if (socket) {
                socket.emit('channel:join', { channelId: channel.id });
            }
        },
    });
};

export const useChatUsers = () => {
    return useQuery({
        queryKey: ['chat', 'users'],
        queryFn: chatApi.getUsers,
    });
};

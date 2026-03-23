import api from '../config';
import type { Notification } from './types';

export const notificationsApi = {
    getAll: () =>
        api.get<Notification[]>('/notifications').then(r => r.data),

    markAsRead: (id: string) =>
        api.patch(`/notifications/${id}/read`).then(r => r.data),

    markAllAsRead: () =>
        api.patch('/notifications/read-all').then(r => r.data),
};

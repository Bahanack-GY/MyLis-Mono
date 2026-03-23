import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from './api';
import i18n from '../../i18n/config';

export const notificationKeys = {
    all: ['notifications'] as const,
};

export const useNotifications = () =>
    useQuery({
        queryKey: notificationKeys.all,
        queryFn: notificationsApi.getAll,
    });

export const useMarkAsRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
    });
};

export const useMarkAllAsRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => {
            toast.success(i18n.t('toast.allNotificationsRead'));
            qc.invalidateQueries({ queryKey: notificationKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

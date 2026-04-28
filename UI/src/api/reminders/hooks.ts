import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi, type CreateReminderDto } from './api';

const KEY = ['reminders'];

export const useReminders = () =>
    useQuery({ queryKey: KEY, queryFn: remindersApi.getAll });

export const useCreateReminder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateReminderDto) => remindersApi.create(dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
};

export const useMarkReminderDone = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => remindersApi.markDone(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
};

export const useDeleteReminder = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => remindersApi.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
};

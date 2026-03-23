import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskNaturesApi } from './api';
import type { CreateTaskNatureDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const taskNatureKeys = {
    all: ['taskNatures'] as const,
};

export const useTaskNatures = () =>
    useQuery({
        queryKey: taskNatureKeys.all,
        queryFn: taskNaturesApi.getAll,
    });

export const useCreateTaskNature = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTaskNatureDto) => taskNaturesApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskNatureCreated'));
            qc.invalidateQueries({ queryKey: taskNatureKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateTaskNature = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateTaskNatureDto> }) =>
            taskNaturesApi.update(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskNatureUpdated'));
            qc.invalidateQueries({ queryKey: taskNatureKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteTaskNature = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => taskNaturesApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskNatureDeleted'));
            qc.invalidateQueries({ queryKey: taskNatureKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

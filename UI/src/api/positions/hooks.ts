import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionsApi } from './api';
import type { CreatePositionDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const positionKeys = {
    all: ['positions'] as const,
    detail: (id: string) => ['positions', id] as const,
};

export const usePositions = () =>
    useQuery({
        queryKey: positionKeys.all,
        queryFn: positionsApi.getAll,
    });

export const usePosition = (id: string) =>
    useQuery({
        queryKey: positionKeys.detail(id),
        queryFn: () => positionsApi.getById(id),
        enabled: !!id,
    });

export const useCreatePosition = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreatePositionDto) => positionsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.positionCreated'));
            qc.invalidateQueries({ queryKey: positionKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdatePosition = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<CreatePositionDto> }) =>
            positionsApi.update(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.positionUpdated'));
            qc.invalidateQueries({ queryKey: positionKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeletePosition = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => positionsApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.positionDeleted'));
            qc.invalidateQueries({ queryKey: positionKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

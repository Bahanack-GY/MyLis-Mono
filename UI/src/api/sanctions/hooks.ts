import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sanctionsApi } from './api';
import type { CreateSanctionDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const sanctionKeys = {
    all: ['sanctions'] as const,
    detail: (id: string) => ['sanctions', id] as const,
    byEmployee: (employeeId: string) => ['sanctions', 'employee', employeeId] as const,
    my: ['sanctions', 'my'] as const,
};

export const useSanctions = () =>
    useQuery({
        queryKey: sanctionKeys.all,
        queryFn: sanctionsApi.getAll,
    });

export const useSanction = (id: string) =>
    useQuery({
        queryKey: sanctionKeys.detail(id),
        queryFn: () => sanctionsApi.getById(id),
        enabled: !!id,
    });

export const useSanctionsByEmployee = (employeeId: string) =>
    useQuery({
        queryKey: sanctionKeys.byEmployee(employeeId),
        queryFn: () => sanctionsApi.getByEmployee(employeeId),
        enabled: !!employeeId,
    });

export const useMySanctions = () =>
    useQuery({
        queryKey: sanctionKeys.my,
        queryFn: sanctionsApi.getMy,
    });

export const useCreateSanction = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateSanctionDto) => sanctionsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.sanctionCreated'));
            qc.invalidateQueries({ queryKey: sanctionKeys.all });
            qc.invalidateQueries({ queryKey: ['sanctions', 'employee'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteSanction = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => sanctionsApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.sanctionDeleted'));
            qc.invalidateQueries({ queryKey: sanctionKeys.all });
            qc.invalidateQueries({ queryKey: ['sanctions', 'employee'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

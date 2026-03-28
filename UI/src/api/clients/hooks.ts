import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { clientsApi } from './api';
import type { CreateClientDto, UpdateClientDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const clientKeys = {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
    byDepartment: (deptId: string) => ['clients', 'department', deptId] as const,
};

export const useClients = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? [...clientKeys.all, departmentId] : clientKeys.all,
        queryFn: () => clientsApi.getAll(departmentId),
    });

export const useInfiniteClients = (
    params: { departmentId?: string; search?: string; type?: string } = {},
) =>
    useInfiniteQuery({
        queryKey: ['clients', 'infinite', params],
        queryFn: ({ pageParam }) =>
            clientsApi.getPaginated({ ...params, page: pageParam as number, limit: 20 }),
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((s, p) => s + p.rows.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
    });

export const useClient = (id: string) =>
    useQuery({
        queryKey: clientKeys.detail(id),
        queryFn: () => clientsApi.getById(id),
        enabled: !!id,
    });

export const useClientsByDepartment = (departmentId: string) =>
    useQuery({
        queryKey: clientKeys.byDepartment(departmentId),
        queryFn: () => clientsApi.getByDepartment(departmentId),
        enabled: !!departmentId,
    });

export const useCreateClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateClientDto) => clientsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.clientCreated'));
            qc.invalidateQueries({ queryKey: clientKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateClientDto }) =>
            clientsApi.update(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.clientUpdated'));
            qc.invalidateQueries({ queryKey: clientKeys.all });
            qc.invalidateQueries({ queryKey: clientKeys.detail(id) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteClient = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => clientsApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.clientDeleted'));
            qc.invalidateQueries({ queryKey: clientKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

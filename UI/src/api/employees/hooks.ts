import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { employeesApi } from './api';
import type { CreateEmployeeDto, UpdateEmployeeDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const employeeKeys = {
    all: ['employees'] as const,
    detail: (id: string) => ['employees', id] as const,
};

export const useLeaderboard = (limit?: number) =>
    useQuery({
        queryKey: ['leaderboard', limit],
        queryFn: () => employeesApi.getLeaderboard(limit),
    });

export const useEmployees = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? [...employeeKeys.all, departmentId] : employeeKeys.all,
        queryFn: () => employeesApi.getAll(departmentId),
    });

export const useInfiniteEmployees = (
    params: { departmentId?: string; search?: string; dismissed?: boolean } = {},
    enabled = true,
) =>
    useInfiniteQuery({
        queryKey: ['employees', 'infinite', params],
        queryFn: ({ pageParam }) =>
            employeesApi.getPaginated({ ...params, page: pageParam as number, limit: 20 }),
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((s, p) => s + p.rows.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
        enabled,
    });

export const useEmployee = (id: string) =>
    useQuery({
        queryKey: employeeKeys.detail(id),
        queryFn: () => employeesApi.getById(id),
        enabled: !!id,
    });

export const useCreateEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateEmployeeDto) => employeesApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.employeeCreated'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeDto }) =>
            employeesApi.update(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.employeeUpdated'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
            qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => employeesApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.employeeDeleted'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDismissEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => employeesApi.dismiss(id),
        onSuccess: (_, id) => {
            toast.success(i18n.t('toast.employeeDismissed'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
            qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useReinstateEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => employeesApi.reinstate(id),
        onSuccess: (_, id) => {
            toast.success(i18n.t('toast.employeeReinstated'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
            qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useChangeEmployeePassword = () =>
    useMutation({
        mutationFn: ({ id, password }: { id: string; password: string }) =>
            employeesApi.changePassword(id, password),
        onSuccess: () => toast.success(i18n.t('toast.passwordChanged')),
        onError: () => toast.error(i18n.t('toast.passwordChangeFailed')),
    });

export const useEmployeeStats = (id: string | number) =>
    useQuery({
        queryKey: ['employee-stats', id],
        queryFn: () => employeesApi.getStats(String(id)),
        enabled: !!id,
    });

export const useEmployeeBadges = (id: string) =>
    useQuery({
        queryKey: ['employee-badges', id],
        queryFn: () => employeesApi.getBadges(id),
        enabled: !!id,
    });

export const useTodayBirthdays = () =>
    useQuery({
        queryKey: ['employees', 'birthdays', 'today'],
        queryFn: employeesApi.getTodayBirthdays,
    });

export const useTransferEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: any }) =>
            employeesApi.transferDepartment(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.employeeTransferred'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
            qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
            qc.invalidateQueries({ queryKey: ['employee-transfer-history', id] });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || i18n.t('toast.error');
            toast.error(message);
        },
    });
};

export const useEmployeeTransferHistory = (id: string) =>
    useQuery({
        queryKey: ['employee-transfer-history', id],
        queryFn: () => employeesApi.getTransferHistory(id),
        enabled: !!id,
    });

export const useEmployeeReports = (id: string) =>
    useQuery({
        queryKey: ['employee-reports', id],
        queryFn: () => employeesApi.getReports(id),
        enabled: !!id,
    });

export const usePromoteEmployee = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: { toRole: string; reason?: string } }) =>
            employeesApi.promote(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.employeePromoted', 'Employé promu avec succès'));
            qc.invalidateQueries({ queryKey: employeeKeys.all });
            qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
            qc.invalidateQueries({ queryKey: ['employee-promotion-history', id] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useEmployeePromotionHistory = (id: string) =>
    useQuery({
        queryKey: ['employee-promotion-history', id],
        queryFn: () => employeesApi.getPromotionHistory(id),
        enabled: !!id,
    });

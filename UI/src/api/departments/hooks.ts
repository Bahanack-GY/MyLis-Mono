import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { departmentsApi, departmentGoalsApi, departmentServicesApi, departmentMonthlyTargetsApi } from './api';
import type { CreateDepartmentDto, UpdateDepartmentDto, CreateDepartmentGoalDto, UpdateDepartmentGoalDto, CreateDepartmentServiceDto, UpdateDepartmentServiceDto, UpsertMonthlyTargetDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const departmentKeys = {
    all: ['departments'] as const,
    detail: (id: string) => ['departments', id] as const,
    goals: ['department-goals'] as const,
    goalsByDept: (deptId: string) => ['department-goals', deptId] as const,
    services: ['department-services'] as const,
    servicesByDept: (deptId: string) => ['department-services', deptId] as const,
    serviceStats: (from?: string, to?: string, departmentId?: string) => ['department-services', 'stats', from, to, departmentId] as const,
    monthlyStats: (deptId: string, year: number) => ['department-monthly-targets', deptId, year] as const,
};

export const useDepartments = () =>
    useQuery({
        queryKey: departmentKeys.all,
        queryFn: departmentsApi.getAll,
    });

export const useInfiniteDepartments = (params: { search?: string } = {}) =>
    useInfiniteQuery({
        queryKey: ['departments', 'infinite', params],
        queryFn: ({ pageParam }) =>
            departmentsApi.getPaginated({ ...params, page: pageParam as number, limit: 20 }),
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((s, p) => s + p.rows.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
    });

export const useDepartment = (id: string) =>
    useQuery({
        queryKey: departmentKeys.detail(id),
        queryFn: () => departmentsApi.getById(id),
        enabled: !!id,
    });

export const useCreateDepartment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateDepartmentDto) => departmentsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.departmentCreated'));
            qc.invalidateQueries({ queryKey: departmentKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateDepartment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateDepartmentDto }) =>
            departmentsApi.update(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.departmentUpdated'));
            qc.invalidateQueries({ queryKey: departmentKeys.all });
            qc.invalidateQueries({ queryKey: departmentKeys.detail(id) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDepartmentGoals = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? departmentKeys.goalsByDept(departmentId) : departmentKeys.goals,
        queryFn: () => departmentId
            ? departmentGoalsApi.getByDepartment(departmentId)
            : departmentGoalsApi.getAll(),
    });

export const useCreateDepartmentGoal = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateDepartmentGoalDto) => departmentGoalsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.goalAdded'));
            qc.invalidateQueries({ queryKey: departmentKeys.goals });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateDepartmentGoal = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateDepartmentGoalDto }) =>
            departmentGoalsApi.update(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.goalUpdated'));
            qc.invalidateQueries({ queryKey: departmentKeys.goals });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteDepartmentGoal = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => departmentGoalsApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.goalDeleted'));
            qc.invalidateQueries({ queryKey: departmentKeys.goals });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDepartmentServices = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? departmentKeys.servicesByDept(departmentId) : departmentKeys.services,
        queryFn: () => departmentId
            ? departmentServicesApi.getByDepartment(departmentId)
            : departmentServicesApi.getAll(),
    });

export const useCreateDepartmentService = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateDepartmentServiceDto) => departmentServicesApi.create(dto),
        onSuccess: (data) => {
            toast.success(i18n.t('toast.serviceCreated'));
            qc.invalidateQueries({ queryKey: departmentKeys.services });
            qc.invalidateQueries({ queryKey: departmentKeys.servicesByDept(data.departmentId) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateDepartmentService = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateDepartmentServiceDto }) =>
            departmentServicesApi.update(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.serviceUpdated'));
            qc.invalidateQueries({ queryKey: departmentKeys.services });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteDepartmentService = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => departmentServicesApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.serviceDeleted'));
            qc.invalidateQueries({ queryKey: departmentKeys.services });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useServiceStats = (from?: string, to?: string, departmentId?: string) =>
    useQuery({
        queryKey: departmentKeys.serviceStats(from, to, departmentId),
        queryFn: () => departmentServicesApi.getServiceStats(from, to, departmentId),
    });

export const useMonthlyStats = (departmentId: string, year: number) =>
    useQuery({
        queryKey: departmentKeys.monthlyStats(departmentId, year),
        queryFn: () => departmentMonthlyTargetsApi.getMonthlyStats(departmentId, year),
        enabled: !!departmentId,
    });

export const useUpsertMonthlyTarget = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: UpsertMonthlyTargetDto) => departmentMonthlyTargetsApi.upsert(dto),
        onSuccess: (_, dto) => {
            toast.success(i18n.t('toast.targetSaved', 'Objective saved'));
            qc.invalidateQueries({ queryKey: departmentKeys.monthlyStats(dto.departmentId, dto.year) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessExpensesApi } from './api';
import type { CreateBusinessExpenseDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const businessExpenseKeys = {
    all: ['businessExpenses'] as const,
    my: ['businessExpenses', 'my'] as const,
    detail: (id: string) => ['businessExpenses', id] as const,
    byEmployee: (id: string) => ['businessExpenses', 'employee', id] as const,
    stats: ['businessExpenses', 'stats'] as const,
    types: ['businessExpenseTypes'] as const,
};

// Type hooks
export const useBusinessExpenseTypes = () =>
    useQuery({ queryKey: businessExpenseKeys.types, queryFn: businessExpensesApi.getTypes });

export const useCreateBusinessExpenseType = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: { name: string; color?: string }) => businessExpensesApi.createType(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseTypeCreated'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.types });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateBusinessExpenseType = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: { name?: string; color?: string } }) =>
            businessExpensesApi.updateType(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseTypeUpdated'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.types });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteBusinessExpenseType = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => businessExpensesApi.deleteType(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseTypeDeleted'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.types });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

// Business Expense hooks
export const useBusinessExpenses = (params?: { status?: string; typeId?: string; employeeId?: string; from?: string; to?: string }) =>
    useQuery({
        queryKey: [...businessExpenseKeys.all, params],
        queryFn: () => businessExpensesApi.getAll(params),
    });

export const useMyBusinessExpenses = () =>
    useQuery({ queryKey: businessExpenseKeys.my, queryFn: businessExpensesApi.getMy });

export const useEmployeeBusinessExpenses = (employeeId: string) =>
    useQuery({
        queryKey: businessExpenseKeys.byEmployee(employeeId),
        queryFn: () => businessExpensesApi.getByEmployee(employeeId),
        enabled: !!employeeId,
    });

export const useBusinessExpenseStats = (employeeId?: string) =>
    useQuery({
        queryKey: [...businessExpenseKeys.stats, employeeId].filter(Boolean),
        queryFn: () => businessExpensesApi.getStats(employeeId),
    });

export const useCreateBusinessExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateBusinessExpenseDto) => businessExpensesApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseSubmitted'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.all });
            qc.invalidateQueries({ queryKey: businessExpenseKeys.my });
            qc.invalidateQueries({ queryKey: businessExpenseKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useValidateBusinessExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => businessExpensesApi.validate(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseValidated'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.all });
            qc.invalidateQueries({ queryKey: businessExpenseKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useRejectBusinessExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => businessExpensesApi.reject(id, reason),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseRejected'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.all });
            qc.invalidateQueries({ queryKey: businessExpenseKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteBusinessExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => businessExpensesApi.remove(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.businessExpenseDeleted'));
            qc.invalidateQueries({ queryKey: businessExpenseKeys.all });
            qc.invalidateQueries({ queryKey: businessExpenseKeys.my });
            qc.invalidateQueries({ queryKey: businessExpenseKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUploadReceipt = () =>
    useMutation({
        mutationFn: (file: File) => businessExpensesApi.uploadReceipt(file),
        onError: () => toast.error(i18n.t('toast.error')),
    });

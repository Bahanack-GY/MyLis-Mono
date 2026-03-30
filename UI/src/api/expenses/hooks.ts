import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from './api';
import type { CreateExpenseDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const expenseKeys = {
    all: ['expenses'] as const,
    list: (page: number, departmentId?: string) => ['expenses', 'list', page, departmentId] as const,
    detail: (id: string) => ['expenses', id] as const,
    stats: (year?: number, departmentId?: string) => ['expenses', 'stats', year, departmentId] as const,
    project: (projectId: string) => ['expenses', 'project', projectId] as const,
};

export const useExpenses = (page = 1, departmentId?: string) =>
    useQuery({
        queryKey: expenseKeys.list(page, departmentId),
        queryFn: () => expensesApi.getAll(page, 10, departmentId),
    });

export const useProjectExpenses = (projectId: string) =>
    useQuery({
        queryKey: expenseKeys.project(projectId),
        queryFn: () => expensesApi.getAllByProject(projectId),
        enabled: !!projectId,
        select: (res) => res.data,
    });

export const useExpense = (id: string) =>
    useQuery({
        queryKey: expenseKeys.detail(id),
        queryFn: () => expensesApi.getById(id),
        enabled: !!id,
    });

export const useExpenseStats = (year?: number, departmentId?: string) =>
    useQuery({
        queryKey: expenseKeys.stats(year, departmentId),
        queryFn: () => expensesApi.getStats(year, departmentId),
    });

export const useCreateExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateExpenseDto) => expensesApi.create(data),
        onSuccess: () => {
            toast.success(i18n.t('toast.expenseRecorded'));
            qc.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateExpenseDto> }) => expensesApi.update(id, data),
        onSuccess: () => {
            toast.success(i18n.t('toast.expenseUpdated'));
            qc.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteExpense = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => expensesApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.expenseDeleted'));
            qc.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

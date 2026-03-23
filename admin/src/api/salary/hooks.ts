import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { salaryApi } from './api';

export const salaryKeys = {
    all: ['salary'] as const,
};

export const useSalaries = () =>
    useQuery({
        queryKey: salaryKeys.all,
        queryFn: salaryApi.getAll,
    });

export const useUpdateSalary = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, salary }: { id: string; salary: number }) =>
            salaryApi.update(id, salary),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: salaryKeys.all });
            toast.success('Salary updated');
        },
        onError: () => toast.error('Failed to update salary'),
    });
};

export const usePayBulk = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ month, year }: { month: number; year: number }) =>
            salaryApi.payBulk(month, year),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            toast.success(`${data.created} salaries paid — total ${data.total.toLocaleString()} FCFA`);
        },
        onError: () => toast.error('Failed to process salary payment'),
    });
};

export const usePayOne = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, month, year }: { id: string; month: number; year: number }) =>
            salaryApi.payOne(id, month, year),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            toast.success(`Salary paid for ${data.name} — ${data.amount.toLocaleString()} FCFA`);
        },
        onError: () => toast.error('Failed to pay salary'),
    });
};

export const usePayAdvance = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
            salaryApi.payAdvance(id, amount, note),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            toast.success(`Advance of ${data.amount.toLocaleString()} FCFA paid to ${data.name}`);
        },
        onError: () => toast.error('Failed to process advance'),
    });
};

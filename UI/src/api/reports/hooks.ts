import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { reportsApi } from './api';
import type { GenerateReportDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const reportKeys = {
    all: ['reports'] as const,
    detail: (id: string) => ['reports', id] as const,
    lockStatus: ['reports', 'lock-status'] as const,
};

export const useReports = () =>
    useQuery({
        queryKey: reportKeys.all,
        queryFn: reportsApi.getAll,
        refetchInterval: 5000, // poll to pick up GENERATING -> COMPLETED transitions
    });

export const useInfiniteReports = () =>
    useInfiniteQuery({
        queryKey: ['reports', 'infinite'],
        queryFn: ({ pageParam }) => reportsApi.getPaginated({ page: pageParam as number, limit: 20 }),
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((s, p) => s + p.rows.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
        initialPageParam: 1,
        refetchInterval: 5000,
    });

export const useReport = (id: string) =>
    useQuery({
        queryKey: reportKeys.detail(id),
        queryFn: () => reportsApi.getById(id),
        enabled: !!id,
    });

export const useReportLockStatus = () =>
    useQuery({
        queryKey: reportKeys.lockStatus,
        queryFn: reportsApi.getLockStatus,
        refetchInterval: 3000,
    });

export const useGenerateReport = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: GenerateReportDto) => reportsApi.generate(dto),
        onSuccess: () => {
            toast.success(i18n.t('reports.toast.generated'));
            qc.invalidateQueries({ queryKey: reportKeys.all });
            qc.invalidateQueries({ queryKey: reportKeys.lockStatus });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message;
            if (msg?.includes('currently being generated')) {
                toast.error(i18n.t('reports.toast.locked'));
            } else {
                toast.error(i18n.t('reports.toast.error'));
            }
        },
    });
};

export const useDeleteReport = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => reportsApi.remove(id),
        onSuccess: () => {
            toast.success(i18n.t('reports.toast.deleted'));
            qc.invalidateQueries({ queryKey: reportKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

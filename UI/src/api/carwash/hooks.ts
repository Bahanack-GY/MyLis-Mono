import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { carwashApi } from './api';

export const useCarwashStations = () =>
    useQuery({ queryKey: ['carwash-stations'], queryFn: carwashApi.getStations, staleTime: 5 * 60 * 1000 });

export const useCarwashEmployees = (stationId?: number) =>
    useQuery({
        queryKey: ['carwash-employees', stationId],
        queryFn: () => carwashApi.getEmployees(stationId),
        staleTime: 5 * 60 * 1000,
    });

export const useCarwashDailyStats = (params: { stationId?: number; startDate?: string; endDate?: string } = {}) =>
    useQuery({
        queryKey: ['carwash-daily-stats', params],
        queryFn: () => carwashApi.getDailyStats(params),
        staleTime: 5 * 60 * 1000,
    });

export const useCarwashOverview = (params: { stationId?: number; startDate?: string; endDate?: string } = {}) =>
    useQuery({
        queryKey: ['carwash-overview', params],
        queryFn: () => carwashApi.getOverview(params),
        staleTime: 5 * 60 * 1000,
    });

export const useCarwashSyncStatus = () =>
    useQuery({
        queryKey: ['carwash-sync-status'],
        queryFn: carwashApi.getSyncStatus,
        refetchInterval: 30_000,
        staleTime: 0,
    });

export const useTriggerCarwashSync = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: carwashApi.triggerSync,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['carwash-sync-status'] });
            setTimeout(() => {
                qc.invalidateQueries({ queryKey: ['carwash-stations'] });
                qc.invalidateQueries({ queryKey: ['carwash-employees'] });
                qc.invalidateQueries({ queryKey: ['carwash-daily-stats'] });
                qc.invalidateQueries({ queryKey: ['carwash-overview'] });
                qc.invalidateQueries({ queryKey: ['carwash-sync-status'] });
            }, 15_000);
        },
    });
};

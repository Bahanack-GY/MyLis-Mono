import { useQuery } from '@tanstack/react-query';
import { logsApi } from './api';

export const logKeys = {
    all: ['logs'] as const,
    stats: ['logs', 'stats'] as const,
};

export const useLogs = (page = 1, action?: string, from?: string, to?: string) =>
    useQuery({
        queryKey: [...logKeys.all, page, action, from, to],
        queryFn: () => logsApi.getAll(page, 10, action, from, to),
    });

export const useLogsStats = (from?: string, to?: string) =>
    useQuery({
        queryKey: [...logKeys.stats, from, to],
        queryFn: () => logsApi.getStats(from, to),
    });

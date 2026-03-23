import api from '../config';
import type { LogsPage, LogsStats } from './types';

export const logsApi = {
    getAll: (page = 1, limit = 10, action?: string, from?: string, to?: string) => {
        const params: Record<string, string | number> = { page, limit };
        if (action) params.action = action;
        if (from) params.from = from;
        if (to) params.to = to;
        return api.get<LogsPage>('/logs', { params }).then(r => r.data);
    },

    getStats: (from?: string, to?: string) => {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        return api.get<LogsStats>('/logs/stats', { params }).then(r => r.data);
    },
};

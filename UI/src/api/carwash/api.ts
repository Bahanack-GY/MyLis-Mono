import api from '../config';
import type { CarwashStation, CarwashEmployee, CarwashDailyStat, CarwashOverview, CarwashSyncStatus } from './types';

export const carwashApi = {
    getStations: () =>
        api.get<CarwashStation[]>('/carwash/stations').then(r => r.data),

    getEmployees: (stationId?: number) =>
        api.get<CarwashEmployee[]>('/carwash/employees', { params: stationId ? { stationId } : {} }).then(r => r.data),

    getDailyStats: (params: { stationId?: number; startDate?: string; endDate?: string } = {}) =>
        api.get<CarwashDailyStat[]>('/carwash/daily-stats', { params }).then(r => r.data),

    getOverview: (params: { stationId?: number; startDate?: string; endDate?: string } = {}) =>
        api.get<CarwashOverview>('/carwash/overview', { params }).then(r => r.data),

    getSyncStatus: () =>
        api.get<CarwashSyncStatus>('/carwash/sync-status').then(r => r.data),

    triggerSync: () =>
        api.post<{ message: string }>('/carwash/sync').then(r => r.data),
};

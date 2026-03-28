import api from '../config';
import type { Report, GenerateReportDto } from './types';

export const reportsApi = {
    generate: (dto: GenerateReportDto) =>
        api.post<Report>('/reports/generate', dto).then(r => r.data),

    getAll: () =>
        api.get<Report[]>('/reports').then(r => r.data),

    getById: (id: string) =>
        api.get<Report>(`/reports/${id}`).then(r => r.data),

    getLockStatus: () =>
        api.get<{ locked: boolean }>('/reports/lock-status').then(r => r.data),

    remove: (id: string) =>
        api.delete(`/reports/${id}`).then(r => r.data),

    getPaginated: (params: { page: number; limit: number }) =>
        api.get<{ rows: Report[]; count: number }>('/reports', { params }).then(r => r.data),
};

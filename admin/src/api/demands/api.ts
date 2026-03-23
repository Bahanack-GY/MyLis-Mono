import api from '../config';
import type { Demand, DemandStats } from './types';

export const demandsApi = {
    getAll: (departmentId?: string) =>
        api.get<Demand[]>('/demands', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Demand>(`/demands/${id}`).then(r => r.data),

    getStats: (departmentId?: string, from?: string, to?: string) =>
        api.get<DemandStats>('/demands/stats', {
            params: {
                ...(departmentId ? { departmentId } : {}),
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
            },
        }).then(r => r.data),

    validate: (id: string) =>
        api.patch<Demand>(`/demands/${id}/validate`).then(r => r.data),

    reject: (id: string, reason?: string) =>
        api.patch<Demand>(`/demands/${id}/reject`, { reason }).then(r => r.data),
};

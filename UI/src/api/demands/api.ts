import api from '../config';
import type { Demand, CreateDemandDto, DemandStats } from './types';

export const demandsApi = {
    getAll: (departmentId?: string) =>
        api.get<Demand[]>('/demands', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Demand>(`/demands/${id}`).then(r => r.data),

    getMyDemands: () =>
        api.get<Demand[]>('/demands/my').then(r => r.data),

    getStats: (departmentId?: string, from?: string, to?: string) =>
        api.get<DemandStats>('/demands/stats', {
            params: {
                ...(departmentId ? { departmentId } : {}),
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
            },
        }).then(r => r.data),

    create: (dto: CreateDemandDto) =>
        api.post<Demand>('/demands', dto).then(r => r.data),

    validate: (id: string) =>
        api.patch<Demand>(`/demands/${id}/validate`).then(r => r.data),

    reject: (id: string, reason?: string) =>
        api.patch<Demand>(`/demands/${id}/reject`, { reason }).then(r => r.data),

    uploadProforma: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<{ filePath: string; fileName: string; fileType: string; size: number }>(
            '/demands/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        ).then(r => r.data);
    },

    uploadImage: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<{ filePath: string; fileName: string; fileType: string; size: number }>(
            '/demands/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        ).then(r => r.data);
    },
};

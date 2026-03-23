import api from '../config';
import type { Demand, CreateDemandDto } from './types';

export const demandsApi = {
    getMyDemands: () =>
        api.get<Demand[]>('/demands/my').then(r => r.data),

    create: (dto: CreateDemandDto) =>
        api.post<Demand>('/demands', dto).then(r => r.data),

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

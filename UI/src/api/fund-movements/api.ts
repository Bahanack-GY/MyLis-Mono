import api from '../config';
import type { FundMovement, CreateFundMovementDto } from './types';

export const fundMovementsApi = {
    getAll: (params: { page?: number; limit?: number; type?: string; ceoUserId?: string } = {}) =>
        api.get<{ rows: FundMovement[]; count: number; stats: any }>('/fund-movements', { params }).then(r => r.data),

    create: (dto: CreateFundMovementDto) =>
        api.post<FundMovement>('/fund-movements', dto).then(r => r.data),

    uploadJustification: (formData: FormData) =>
        api.post<{ filePath: string; originalName: string }>('/fund-movements/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/fund-movements/${id}`).then(r => r.data),
};

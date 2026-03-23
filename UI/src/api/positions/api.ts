import api from '../config';
import type { Position, CreatePositionDto } from './types';

export const positionsApi = {
    getAll: () =>
        api.get<Position[]>('/organization/positions').then(r => r.data),

    getById: (id: string) =>
        api.get<Position>(`/organization/positions/${id}`).then(r => r.data),

    create: (dto: CreatePositionDto) =>
        api.post<Position>('/organization/positions', dto).then(r => r.data),

    update: (id: string, dto: Partial<CreatePositionDto>) =>
        api.patch<Position>(`/organization/positions/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/organization/positions/${id}`).then(r => r.data),
};

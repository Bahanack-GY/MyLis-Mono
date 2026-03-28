import api from '../config';
import type { Client, CreateClientDto, UpdateClientDto } from './types';

export const clientsApi = {
    getAll: (departmentId?: string) =>
        api.get<Client[]>('/clients', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Client>(`/clients/${id}`).then(r => r.data),

    create: (dto: CreateClientDto) =>
        api.post<Client>('/clients', dto).then(r => r.data),

    update: (id: string, dto: UpdateClientDto) =>
        api.put<Client>(`/clients/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/clients/${id}`).then(r => r.data),

    getByDepartment: (departmentId: string) =>
        api.get<Client[]>(`/clients/department/${departmentId}`).then(r => r.data),

    getPaginated: (params: { departmentId?: string; search?: string; type?: string; page: number; limit: number }) => {
        const p: Record<string, string | number> = { page: params.page, limit: params.limit };
        if (params.departmentId) p.departmentId = params.departmentId;
        if (params.search) p.search = params.search;
        if (params.type) p.type = params.type;
        return api.get<{ rows: Client[]; count: number }>('/clients', { params: p }).then(r => r.data);
    },
};

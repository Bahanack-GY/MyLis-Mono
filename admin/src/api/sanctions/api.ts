import api from '../config';
import type { Sanction, CreateSanctionDto } from './types';

export const sanctionsApi = {
    getAll: () =>
        api.get<Sanction[]>('/hr/sanctions').then(r => r.data),

    getById: (id: string) =>
        api.get<Sanction>(`/hr/sanctions/${id}`).then(r => r.data),

    getByEmployee: (employeeId: string) =>
        api.get<Sanction[]>(`/hr/sanctions/employee/${employeeId}`).then(r => r.data),

    create: (dto: CreateSanctionDto) =>
        api.post<Sanction>('/hr/sanctions', dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/hr/sanctions/${id}`).then(r => r.data),
};

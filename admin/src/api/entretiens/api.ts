import api from '../config';
import type { Entretien, CreateEntretienDto } from './types';

export const entretiensApi = {
    getAll: () =>
        api.get<Entretien[]>('/hr/entretiens').then(r => r.data),

    getById: (id: string) =>
        api.get<Entretien>(`/hr/entretiens/${id}`).then(r => r.data),

    create: (dto: CreateEntretienDto) =>
        api.post<Entretien>('/hr/entretiens', dto).then(r => r.data),
};

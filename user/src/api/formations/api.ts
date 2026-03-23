import api from '../config';
import type { Formation, CreateFormationDto } from './types';

export const formationsApi = {
    getAll: () =>
        api.get<Formation[]>('/hr/formations').then(r => r.data),

    create: (dto: CreateFormationDto) =>
        api.post<Formation>('/hr/formations', dto).then(r => r.data),
};

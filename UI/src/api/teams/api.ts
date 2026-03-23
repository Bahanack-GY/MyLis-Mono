import api from '../config';
import type { Team, CreateTeamDto } from './types';

export const teamsApi = {
    getAll: () =>
        api.get<Team[]>('/organization/teams').then(r => r.data),

    getById: (id: string) =>
        api.get<Team>(`/organization/teams/${id}`).then(r => r.data),

    create: (dto: CreateTeamDto) =>
        api.post<Team>('/organization/teams', dto).then(r => r.data),
};

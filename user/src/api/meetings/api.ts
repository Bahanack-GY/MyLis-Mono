import api from '../config';
import type { Meeting } from './types';

export const meetingsApi = {
    getAll: () =>
        api.get<Meeting[]>('/meetings').then(r => r.data),

    getById: (id: string) =>
        api.get<Meeting>(`/meetings/${id}`).then(r => r.data),
};

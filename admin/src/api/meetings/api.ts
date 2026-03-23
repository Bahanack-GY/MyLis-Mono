import api from '../config';
import type { Meeting, CreateMeetingDto, UpdateMeetingDto } from './types';

export const meetingsApi = {
    getAll: (departmentId?: string) =>
        api.get<Meeting[]>('/meetings', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Meeting>(`/meetings/${id}`).then(r => r.data),

    create: (dto: CreateMeetingDto) =>
        api.post<Meeting>('/meetings', dto).then(r => r.data),

    update: (id: string, dto: UpdateMeetingDto) =>
        api.patch<Meeting>(`/meetings/${id}`, dto).then(r => r.data),

    remove: (id: string) =>
        api.delete(`/meetings/${id}`).then(r => r.data),
};

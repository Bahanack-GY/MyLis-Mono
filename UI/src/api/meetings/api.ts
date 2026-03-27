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

    startMeeting: (id: string, secretaryId: string) =>
        api.patch<Meeting>(`/meetings/${id}/start`, { secretaryId }).then(r => r.data),

    endMeeting: (id: string) =>
        api.patch<Meeting>(`/meetings/${id}/end`).then(r => r.data),

    attend: (id: string) =>
        api.patch<Meeting>(`/meetings/${id}/attend`).then(r => r.data),

    uploadRecording: (id: string, audioBlob: Blob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        return api.post<Meeting>(`/meetings/${id}/recording`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000, // 5 minutes for long recordings
        }).then(r => r.data);
    },
};

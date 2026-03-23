import api from '../config';
import type { Task, CreateTaskDto, UpdateTaskDto } from './types';

export const tasksApi = {
    getAll: (departmentId?: string, from?: string, to?: string) => {
        const params: Record<string, string> = {};
        if (departmentId) params.departmentId = departmentId;
        if (from) params.from = from;
        if (to) params.to = to;
        return api.get<Task[]>('/tasks', { params }).then(r => r.data);
    },

    getById: (id: string) =>
        api.get<Task>(`/tasks/${id}`).then(r => r.data),

    getMyTasks: () =>
        api.get<Task[]>('/tasks/my-tasks').then(r => r.data),

    create: (dto: CreateTaskDto) =>
        api.post<Task>('/tasks', dto).then(r => r.data),

    update: (id: string, dto: UpdateTaskDto) =>
        api.patch<Task>(`/tasks/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/tasks/${id}`).then(r => r.data),

    getByProject: (projectId: string) =>
        api.get<Task[]>(`/tasks/project/${projectId}`).then(r => r.data),

    getHistory: (taskId: string) =>
        api.get(`/tasks/${taskId}/history`).then(r => r.data),
};

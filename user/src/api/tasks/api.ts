import api from '../config';
import type { Task, TaskUpdateResponse, SelfAssignTaskDto } from './types';

export const tasksApi = {
    getMyTasks: () =>
        api.get<Task[]>('/tasks/my-tasks').then(r => r.data),

    getByEmployee: (employeeId: string) =>
        api.get<Task[]>(`/tasks/employee/${employeeId}`).then(r => r.data),

    updateState: (taskId: string, state: string, blockReason?: string) =>
        api.patch<TaskUpdateResponse>(`/tasks/update-state/${taskId}`, { state, blockReason }).then(r => r.data),

    selfAssign: (dto: SelfAssignTaskDto) =>
        api.post<Task>('/tasks/self-assign', dto).then(r => r.data),

    updateTask: (id: string, dto: Partial<SelfAssignTaskDto>) =>
        api.patch(`/tasks/${id}`, dto).then(r => r.data),

    deleteTask: (id: string) =>
        api.delete(`/tasks/${id}`).then(r => r.data),

    getHistory: (id: string) =>
        api.get(`/tasks/${id}/history`).then(r => r.data),
};

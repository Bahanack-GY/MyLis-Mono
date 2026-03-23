import api from '../config';
import type { Task, CreateTaskDto, UpdateTaskDto, TaskUpdateResponse, SelfAssignTaskDto, WeeklyComplianceResult, Subtask } from './types';

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

    getByEmployee: (employeeId: string) =>
        api.get<Task[]>(`/tasks/employee/${employeeId}`).then(r => r.data),

    create: (dto: CreateTaskDto) =>
        api.post<Task>('/tasks', dto).then(r => r.data),

    update: (id: string, dto: UpdateTaskDto) =>
        api.patch<Task>(`/tasks/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/tasks/${id}`).then(r => r.data),

    getByProject: (projectId: string) =>
        api.get<Task[]>(`/tasks/project/${projectId}`).then(r => r.data),

    updateState: (taskId: string, state: string, blockReason?: string) =>
        api.patch<TaskUpdateResponse>(`/tasks/update-state/${taskId}`, { state, blockReason }).then(r => r.data),

    selfAssign: (dto: SelfAssignTaskDto) =>
        api.post<Task>('/tasks/self-assign', dto).then(r => r.data),

    getHistory: (taskId: string) =>
        api.get(`/tasks/${taskId}/history`).then(r => r.data),

    weeklyCheck: () =>
        api.get<WeeklyComplianceResult>('/tasks/weekly-check').then(r => r.data),

    weeklyCheckForEmployee: (employeeId: string) =>
        api.get<WeeklyComplianceResult>(`/tasks/weekly-check/${employeeId}`).then(r => r.data),

    getMyWeek: (weekStartDate: string) =>
        api.get<Task[]>(`/tasks/my-week?start=${weekStartDate}`).then(r => r.data),

    getWeekByEmployee: (employeeId: string, weekStartDate: string) =>
        api.get<Task[]>(`/tasks/week?start=${weekStartDate}&employeeId=${employeeId}`).then(r => r.data),

    getAllWeek: (weekStartDate: string) =>
        api.get<Task[]>(`/tasks/week?start=${weekStartDate}`).then(r => r.data),

    // Subtasks
    createSubtask: (taskId: string, title: string) =>
        api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title }).then(r => r.data),

    getSubtasks: (taskId: string) =>
        api.get<Subtask[]>(`/tasks/${taskId}/subtasks`).then(r => r.data),

    updateSubtask: (id: string, dto: { title?: string; completed?: boolean; order?: number }) =>
        api.patch<Subtask>(`/tasks/subtasks/${id}`, dto).then(r => r.data),

    deleteSubtask: (id: string) =>
        api.delete(`/tasks/subtasks/${id}`).then(r => r.data),

    toggleSubtask: (id: string) =>
        api.patch<Subtask>(`/tasks/subtasks/${id}/toggle`).then(r => r.data),

    reorderSubtasks: (taskId: string, subtaskIds: string[]) =>
        api.patch(`/tasks/${taskId}/subtasks/reorder`, { subtaskIds }).then(r => r.data),
};

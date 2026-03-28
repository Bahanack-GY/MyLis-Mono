import api from '../config';
import type { Task, CreateTaskDto, UpdateTaskDto, TaskUpdateResponse, SelfAssignTaskDto, WeeklyComplianceResult, Subtask, TaskAttachment, TimeDistributionItem } from './types';

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

    getByLead: (leadId: string) =>
        api.get<Task[]>(`/tasks/lead/${leadId}`).then(r => r.data),

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

    transferTask: (taskId: string, targetWeekStart: string) =>
        api.post<Task>(`/tasks/transfer/${taskId}`, { targetWeekStart }).then(r => r.data),

    getPaginated: (params: {
        states: string[];
        page: number;
        limit: number;
        departmentId?: string;
        employeeId?: string;
        boardFrom?: string;
        boardTo?: string;
    }) => {
        const p: Record<string, string | number> = {
            states: params.states.join(','),
            page: params.page,
            limit: params.limit,
        };
        if (params.departmentId) p.departmentId = params.departmentId;
        if (params.employeeId) p.employeeId = params.employeeId;
        if (params.boardFrom) p.boardFrom = params.boardFrom;
        if (params.boardTo) p.boardTo = params.boardTo;
        return api.get<{ rows: Task[]; count: number }>('/tasks', { params: p }).then(r => r.data);
    },

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
        api.patch<{ subtask: Subtask; pointsEarned: number; totalPoints: number; allCompleted: boolean; taskStarted: boolean }>(`/tasks/subtasks/${id}/toggle`).then(r => r.data),

    reorderSubtasks: (taskId: string, subtaskIds: string[]) =>
        api.patch(`/tasks/${taskId}/subtasks/reorder`, { subtaskIds }).then(r => r.data),

    // Attachments
    uploadAttachment: (taskId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<TaskAttachment>(`/tasks/${taskId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
    },

    deleteAttachment: (taskId: string, attachmentId: string) =>
        api.delete(`/tasks/${taskId}/attachments/${attachmentId}`).then(r => r.data),

    getTimeDistribution: (employeeId: string) =>
        api.get<TimeDistributionItem[]>(`/tasks/employee/${employeeId}/time-distribution`).then(r => r.data),
};

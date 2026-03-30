import api from '../config';
import type { Project, CreateProjectDto, UpdateProjectDto, ProjectMilestone } from './types';

export const projectsApi = {
    getAll: (departmentId?: string) =>
        api.get<Project[]>('/projects', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Project>(`/projects/${id}`).then(r => r.data),

    create: (dto: CreateProjectDto) =>
        api.post<Project>('/projects', dto).then(r => r.data),

    update: (id: string, dto: UpdateProjectDto) =>
        api.put<Project>(`/projects/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/projects/${id}`).then(r => r.data),

    getByClient: (clientId: string) =>
        api.get<Project[]>(`/projects/client/${clientId}`).then(r => r.data),

    getMyProjects: () =>
        api.get<Project[]>('/projects/my-projects').then(r => r.data),

    getMyProjectDetail: (id: string) =>
        api.get<Project>(`/projects/my-projects/${id}`).then(r => r.data),

    createMilestone: (projectId: string, dto: { title: string; description?: string; dueDate?: string; order?: number }) =>
        api.post<ProjectMilestone>(`/projects/${projectId}/milestones`, dto).then(r => r.data),

    updateMilestone: (projectId: string, milestoneId: string, dto: { title?: string; description?: string; dueDate?: string; order?: number }) =>
        api.patch<ProjectMilestone>(`/projects/${projectId}/milestones/${milestoneId}`, dto).then(r => r.data),

    toggleMilestone: (projectId: string, milestoneId: string) =>
        api.patch<ProjectMilestone>(`/projects/${projectId}/milestones/${milestoneId}/toggle`).then(r => r.data),

    deleteMilestone: (projectId: string, milestoneId: string) =>
        api.delete(`/projects/${projectId}/milestones/${milestoneId}`).then(r => r.data),
};

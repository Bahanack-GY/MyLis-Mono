import api from '../config';
import type { Project, CreateProjectDto, UpdateProjectDto } from './types';

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
};

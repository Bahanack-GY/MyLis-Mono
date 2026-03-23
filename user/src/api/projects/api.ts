import api from '../config';
import type { Project } from './types';

export const projectsApi = {
    getMyProjects: () =>
        api.get<Project[]>('/projects/my-projects').then(r => r.data),

    getMyProjectDetail: (id: string) =>
        api.get<Project>(`/projects/my-projects/${id}`).then(r => r.data),
};

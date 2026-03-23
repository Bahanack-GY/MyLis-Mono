import api from '../config';
import type { TaskNature, CreateTaskNatureDto } from './types';

export const taskNaturesApi = {
    getAll: () =>
        api.get<TaskNature[]>('/task-natures').then(r => r.data),

    create: (dto: CreateTaskNatureDto) =>
        api.post<TaskNature>('/task-natures', dto).then(r => r.data),

    update: (id: string, dto: Partial<CreateTaskNatureDto>) =>
        api.patch<TaskNature>(`/task-natures/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/task-natures/${id}`).then(r => r.data),
};

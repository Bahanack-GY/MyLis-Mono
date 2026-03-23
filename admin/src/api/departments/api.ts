import api from '../config';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto, DepartmentGoal, CreateDepartmentGoalDto, UpdateDepartmentGoalDto } from './types';

export const departmentsApi = {
    getAll: () =>
        api.get<Department[]>('/organization/departments').then(r => r.data),

    getById: (id: string) =>
        api.get<Department>(`/organization/departments/${id}`).then(r => r.data),

    create: (dto: CreateDepartmentDto) =>
        api.post<Department>('/organization/departments', dto).then(r => r.data),

    update: (id: string, dto: UpdateDepartmentDto) =>
        api.patch<Department>(`/organization/departments/${id}`, dto).then(r => r.data),
};

export const departmentGoalsApi = {
    getAll: () =>
        api.get<DepartmentGoal[]>('/organization/department-goals').then(r => r.data),

    getByDepartment: (departmentId: string) =>
        api.get<DepartmentGoal[]>(`/organization/department-goals/department/${departmentId}`).then(r => r.data),

    getByDepartmentAndYear: (departmentId: string, year: number) =>
        api.get<DepartmentGoal>(`/organization/department-goals/department/${departmentId}/year/${year}`).then(r => r.data),

    create: (dto: CreateDepartmentGoalDto) =>
        api.post<DepartmentGoal>('/organization/department-goals', dto).then(r => r.data),

    update: (id: string, dto: UpdateDepartmentGoalDto) =>
        api.patch<DepartmentGoal>(`/organization/department-goals/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/organization/department-goals/${id}`).then(r => r.data),
};

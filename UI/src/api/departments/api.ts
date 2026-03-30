import api from '../config';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto, DepartmentGoal, CreateDepartmentGoalDto, UpdateDepartmentGoalDto, DepartmentService, CreateDepartmentServiceDto, UpdateDepartmentServiceDto, DepartmentMonthlyTarget, MonthlyStatRow, UpsertMonthlyTargetDto } from './types';

export const departmentsApi = {
    getAll: () =>
        api.get<Department[]>('/organization/departments').then(r => r.data),

    getById: (id: string) =>
        api.get<Department>(`/organization/departments/${id}`).then(r => r.data),

    create: (dto: CreateDepartmentDto) =>
        api.post<Department>('/organization/departments', dto).then(r => r.data),

    update: (id: string, dto: UpdateDepartmentDto) =>
        api.patch<Department>(`/organization/departments/${id}`, dto).then(r => r.data),

    getPaginated: (params: { search?: string; page: number; limit: number }) => {
        const p: Record<string, string | number> = { page: params.page, limit: params.limit };
        if (params.search) p.search = params.search;
        return api.get<{ rows: Department[]; count: number }>('/organization/departments', { params: p }).then(r => r.data);
    },
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

export const departmentMonthlyTargetsApi = {
    upsert: (dto: UpsertMonthlyTargetDto) =>
        api.post<DepartmentMonthlyTarget>('/organization/department-monthly-targets', dto).then(r => r.data),

    getMonthlyStats: (departmentId: string, year: number) =>
        api.get<MonthlyStatRow[]>(`/organization/department-monthly-targets/${departmentId}/stats`, { params: { year } }).then(r => r.data),

    getByDepartmentAndYear: (departmentId: string, year: number) =>
        api.get<DepartmentMonthlyTarget[]>(`/organization/department-monthly-targets/${departmentId}`, { params: { year } }).then(r => r.data),
};

export const departmentServicesApi = {
    getAll: () =>
        api.get<DepartmentService[]>('/organization/department-services').then(r => r.data),

    getByDepartment: (departmentId: string) =>
        api.get<DepartmentService[]>(`/organization/department-services/department/${departmentId}`).then(r => r.data),

    getById: (id: string) =>
        api.get<DepartmentService>(`/organization/department-services/${id}`).then(r => r.data),

    create: (dto: CreateDepartmentServiceDto) =>
        api.post<DepartmentService>('/organization/department-services', dto).then(r => r.data),

    update: (id: string, dto: UpdateDepartmentServiceDto) =>
        api.patch<DepartmentService>(`/organization/department-services/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete(`/organization/department-services/${id}`).then(r => r.data),

    getServiceStats: (from?: string, to?: string, departmentId?: string) => {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        if (departmentId) params.departmentId = departmentId;
        return api.get<{ serviceId: string; name: string; projectCount: number; leadCount: number; total: number }[]>(
            '/organization/department-services/stats',
            { params },
        ).then(r => r.data);
    },
};

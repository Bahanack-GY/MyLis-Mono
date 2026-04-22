import api from '../config';
import type { Expense, CreateExpenseDto, ExpenseStats, PaginatedExpenses, JustificationFile } from './types';

export const expensesApi = {
    uploadJustification: (formData: FormData) =>
        api.post<JustificationFile>('/expenses/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(res => res.data),

    getAll: (page = 1, limit = 10, departmentId?: string) =>
        api.get<PaginatedExpenses>('/expenses', { params: { page, limit, ...(departmentId ? { departmentId } : {}) } }).then(res => res.data),

    getAllByProject: (projectId: string) =>
        api.get<PaginatedExpenses>('/expenses', { params: { projectId, page: 1, limit: 1000 } }).then(res => res.data),

    getById: (id: string) =>
        api.get<Expense>(`/expenses/${id}`).then(res => res.data),

    getStats: (year?: number, departmentId?: string) =>
        api.get<ExpenseStats>('/expenses/stats', { params: { year, departmentId } }).then(res => res.data),

    create: (data: CreateExpenseDto) =>
        api.post<Expense>('/expenses', data).then(res => res.data),

    update: (id: string, data: Partial<CreateExpenseDto>) =>
        api.patch<Expense>(`/expenses/${id}`, data).then(res => res.data),

    delete: (id: string) =>
        api.delete<{ success: boolean }>(`/expenses/${id}`).then(res => res.data),
};

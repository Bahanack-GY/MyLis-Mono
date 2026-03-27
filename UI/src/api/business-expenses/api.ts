import api from '../config';
import type {
    BusinessExpense, BusinessExpenseType, CreateBusinessExpenseDto, BusinessExpenseStats,
} from './types';

export const businessExpensesApi = {
    // Types
    getTypes: () =>
        api.get<BusinessExpenseType[]>('/business-expenses/types').then(r => r.data),
    createType: (dto: { name: string; color?: string }) =>
        api.post<BusinessExpenseType>('/business-expenses/types', dto).then(r => r.data),
    updateType: (id: string, dto: { name?: string; color?: string }) =>
        api.patch<BusinessExpenseType>(`/business-expenses/types/${id}`, dto).then(r => r.data),
    deleteType: (id: string) =>
        api.delete(`/business-expenses/types/${id}`).then(r => r.data),

    // Business Expenses
    getAll: (params?: { status?: string; typeId?: string; employeeId?: string; from?: string; to?: string }) =>
        api.get<BusinessExpense[]>('/business-expenses', { params }).then(r => r.data),
    getMy: () =>
        api.get<BusinessExpense[]>('/business-expenses/my').then(r => r.data),
    getByEmployee: (employeeId: string) =>
        api.get<BusinessExpense[]>(`/business-expenses/employee/${employeeId}`).then(r => r.data),
    getById: (id: string) =>
        api.get<BusinessExpense>(`/business-expenses/${id}`).then(r => r.data),
    getStats: (employeeId?: string) =>
        api.get<BusinessExpenseStats>('/business-expenses/stats', {
            params: employeeId ? { employeeId } : {},
        }).then(r => r.data),
    create: (dto: CreateBusinessExpenseDto) =>
        api.post<BusinessExpense>('/business-expenses', dto).then(r => r.data),
    validate: (id: string) =>
        api.patch<BusinessExpense>(`/business-expenses/${id}/validate`).then(r => r.data),
    reject: (id: string, reason?: string) =>
        api.patch<BusinessExpense>(`/business-expenses/${id}/reject`, { reason }).then(r => r.data),
    remove: (id: string) =>
        api.delete(`/business-expenses/${id}`).then(r => r.data),

    // Upload
    uploadReceipt: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<{ filePath: string; fileName: string; fileType: string; size: number }>(
            '/business-expenses/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        ).then(r => r.data);
    },
};

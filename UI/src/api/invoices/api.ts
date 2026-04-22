import api from '../config';
import type {
    Invoice,
    CreateInvoiceDto,
    UpdateInvoiceDto,
    InvoiceStats,
    InvoiceTemplate,
    UpsertInvoiceTemplateDto,
} from './types';

export const invoicesApi = {
    getAll: (departmentId?: string) =>
        api.get<Invoice[]>('/invoices', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Invoice>(`/invoices/${id}`).then(r => r.data),

    create: (dto: CreateInvoiceDto) =>
        api.post<Invoice>('/invoices', dto).then(r => r.data),

    update: (id: string, dto: UpdateInvoiceDto) =>
        api.patch<Invoice>(`/invoices/${id}`, dto).then(r => r.data),

    send: (id: string) =>
        api.patch<Invoice>(`/invoices/${id}/send`).then(r => r.data),

    pay: (id: string) =>
        api.patch<Invoice>(`/invoices/${id}/pay`).then(r => r.data),

    reject: (id: string) =>
        api.patch<Invoice>(`/invoices/${id}/reject`).then(r => r.data),

    validateProforma: (id: string) =>
        api.patch<Invoice>(`/invoices/${id}/validate`).then(r => r.data),

    createAcompte: (id: string, amount: number) =>
        api.post<Invoice>(`/invoices/${id}/acompte`, { amount }).then(r => r.data),

    remove: (id: string) =>
        api.delete(`/invoices/${id}`).then(r => r.data),

    getStats: (departmentId?: string, from?: string, to?: string) => {
        const params: Record<string, string> = {};
        if (departmentId) params.departmentId = departmentId;
        if (from) params.from = from;
        if (to) params.to = to;
        return api.get<InvoiceStats>('/invoices/stats', { params }).then(r => r.data);
    },

    getRevenueByDepartment: (from?: string, to?: string) => {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;
        return api.get<{ departmentId: string; department: string; revenue: number }[]>('/invoices/revenue-by-department', { params }).then(r => r.data);
    },
};

export const invoiceTemplatesApi = {
    getByDepartment: (departmentId: string) =>
        api.get<InvoiceTemplate>(`/invoices/templates/department/${departmentId}`).then(r => r.data),

    upsert: (departmentId: string, dto: UpsertInvoiceTemplateDto) =>
        api.patch<InvoiceTemplate>(`/invoices/templates/department/${departmentId}`, dto).then(r => r.data),
};

import api from '../config';
import type {
    Lead, CreateLeadDto,
    LeadActivity, CreateLeadActivityDto,
    ClientPayment, CreatePaymentDto,
    PaginatedResponse, LeadStats, CommercialKpis,
    ClientStatement, SalesSummary,
    CommercialPerformance, MyGoal, SetGoalDto,
} from './types';

// ── Leads ──
export const leadsApi = {
    getAll: (params?: {
        page?: number; limit?: number; search?: string;
        saleStage?: string; leadStatus?: string; priority?: string;
        leadType?: string; assignedToId?: string;
        dateFrom?: string; dateTo?: string;
    }) =>
        api.get<PaginatedResponse<Lead>>('/leads', { params }).then(r => r.data),

    getById: (id: string) =>
        api.get<Lead>(`/leads/${id}`).then(r => r.data),

    create: (data: CreateLeadDto) =>
        api.post<Lead>('/leads', data).then(r => r.data),

    update: (id: string, data: Partial<CreateLeadDto>) =>
        api.patch<Lead>(`/leads/${id}`, data).then(r => r.data),

    delete: (id: string) =>
        api.delete<{ success: boolean }>(`/leads/${id}`).then(r => r.data),

    convert: (id: string, data?: { name?: string; projectDescription?: string; type?: string; price?: string; departmentId?: string; srs?: string; contract?: string }) =>
        api.patch<Lead>(`/leads/${id}/convert`, data || {}).then(r => r.data),

    getStats: (params?: { dateFrom?: string; dateTo?: string; assignedToId?: string }) =>
        api.get<LeadStats>('/leads/stats', { params }).then(r => r.data),
};

// ── Lead Activities ──
export const leadActivitiesApi = {
    getAll: (params?: {
        page?: number; limit?: number; leadId?: string;
        employeeId?: string; type?: string; activityStatus?: string;
        dateFrom?: string; dateTo?: string;
    }) =>
        api.get<PaginatedResponse<LeadActivity>>('/lead-activities', { params }).then(r => r.data),

    getById: (id: string) =>
        api.get<LeadActivity>(`/lead-activities/${id}`).then(r => r.data),

    create: (data: CreateLeadActivityDto) =>
        api.post<LeadActivity>('/lead-activities', data).then(r => r.data),

    update: (id: string, data: Partial<CreateLeadActivityDto>) =>
        api.patch<LeadActivity>(`/lead-activities/${id}`, data).then(r => r.data),

    delete: (id: string) =>
        api.delete<{ success: boolean }>(`/lead-activities/${id}`).then(r => r.data),

    getKpis: (params?: { employeeId?: string; dateFrom?: string; dateTo?: string }) =>
        api.get<CommercialKpis>('/lead-activities/kpis', { params }).then(r => r.data),

    getClientActivitiesReport: (clientId: string, params?: { dateFrom?: string; dateTo?: string }) =>
        api.get(`/lead-activities/client/${clientId}/report`, { params }).then(r => r.data),

    getClientHealthMetrics: (clientId: string) =>
        api.get(`/lead-activities/client/${clientId}/health`).then(r => r.data),
};

// ── Commercial Goals ──
export const commercialGoalsApi = {
    /** Manager: get all commercials' CA vs goal for a given month */
    getTeamPerformance: (params?: { year?: number; month?: number }) =>
        api.get<CommercialPerformance[]>('/commercial-goals', { params }).then(r => r.data),

    /** Commercial: get own CA vs goal for a given month */
    getMyGoal: (params?: { year?: number; month?: number }) =>
        api.get<MyGoal>('/commercial-goals/my', { params }).then(r => r.data),

    /** Manager: get a specific commercial's CA vs goal for a given month */
    getEmployeeGoal: (params: { employeeId: string; year?: number; month?: number }) =>
        api.get<MyGoal>('/commercial-goals/employee-goal', { params }).then(r => r.data),

    /** Manager: set or update a monthly goal for a commercial */
    setGoal: (data: SetGoalDto) =>
        api.post('/commercial-goals', data).then(r => r.data),
};

// ── Client Payments ──
export const clientPaymentsApi = {
    getAll: (params?: {
        page?: number; limit?: number; clientId?: string;
        invoiceId?: string; dateFrom?: string; dateTo?: string;
    }) =>
        api.get<PaginatedResponse<ClientPayment>>('/client-payments', { params }).then(r => r.data),

    getById: (id: string) =>
        api.get<ClientPayment>(`/client-payments/${id}`).then(r => r.data),

    create: (data: CreatePaymentDto) =>
        api.post<ClientPayment>('/client-payments', data).then(r => r.data),

    update: (id: string, data: Partial<CreatePaymentDto>) =>
        api.patch<ClientPayment>(`/client-payments/${id}`, data).then(r => r.data),

    delete: (id: string) =>
        api.delete<{ success: boolean }>(`/client-payments/${id}`).then(r => r.data),

    getClientStatement: (clientId: string) =>
        api.get<ClientStatement>(`/client-payments/client-statement/${clientId}`).then(r => r.data),

    getSalesSummary: () =>
        api.get<SalesSummary>('/client-payments/sales-summary').then(r => r.data),
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18n from '../../i18n/config';
import { leadsApi, leadActivitiesApi, clientPaymentsApi, commercialGoalsApi } from './api';
import type { CreateLeadDto, CreateLeadActivityDto, CreatePaymentDto, SetGoalDto } from './types';

// ── Query Keys ──
export const commercialKeys = {
    leads: {
        all: ['leads'] as const,
        list: (filters?: any) => ['leads', 'list', filters] as const,
        detail: (id: string) => ['leads', id] as const,
        stats: (filters?: any) => ['leads', 'stats', filters] as const,
    },
    activities: {
        all: ['lead-activities'] as const,
        list: (filters?: any) => ['lead-activities', 'list', filters] as const,
        kpis: (filters?: any) => ['lead-activities', 'kpis', filters] as const,
        clientReport: (clientId: string, filters?: any) => ['lead-activities', 'client-report', clientId, filters] as const,
        clientHealth: (clientId: string) => ['lead-activities', 'client-health', clientId] as const,
    },
    payments: {
        all: ['client-payments'] as const,
        list: (filters?: any) => ['client-payments', 'list', filters] as const,
        clientStatement: (clientId: string) => ['client-payments', 'statement', clientId] as const,
        salesSummary: ['client-payments', 'sales-summary'] as const,
    },
    goals: {
        all: ['commercial-goals'] as const,
        team: (params?: any) => ['commercial-goals', 'team', params] as const,
        my: (params?: any) => ['commercial-goals', 'my', params] as const,
    },
};

// ── Leads Hooks ──
export const useLeads = (filters?: any) =>
    useQuery({
        queryKey: commercialKeys.leads.list(filters),
        queryFn: () => leadsApi.getAll(filters),
    });

export const useLead = (id: string) =>
    useQuery({
        queryKey: commercialKeys.leads.detail(id),
        queryFn: () => leadsApi.getById(id),
        enabled: !!id,
    });

export const useLeadStats = (filters?: any) =>
    useQuery({
        queryKey: commercialKeys.leads.stats(filters),
        queryFn: () => leadsApi.getStats(filters),
    });

export const useCreateLead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateLeadDto) => leadsApi.create(data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.leadCreated'));
            qc.invalidateQueries({ queryKey: commercialKeys.leads.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateLead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeadDto> }) =>
            leadsApi.update(id, data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.leadUpdated'));
            qc.invalidateQueries({ queryKey: commercialKeys.leads.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteLead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => leadsApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.leadDeleted'));
            qc.invalidateQueries({ queryKey: commercialKeys.leads.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useConvertLead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data?: { name?: string; projectDescription?: string; type?: string; price?: string; departmentId?: string; srs?: string; contract?: string } }) =>
            leadsApi.convert(id, data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.leadConverted'));
            qc.invalidateQueries({ queryKey: commercialKeys.leads.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

// ── Lead Activities Hooks ──
export const useLeadActivities = (filters?: any) =>
    useQuery({
        queryKey: commercialKeys.activities.list(filters),
        queryFn: () => leadActivitiesApi.getAll(filters),
    });

export const useCommercialKpis = (filters?: any) =>
    useQuery({
        queryKey: commercialKeys.activities.kpis(filters),
        queryFn: () => leadActivitiesApi.getKpis(filters),
    });

export const useCreateLeadActivity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateLeadActivityDto) => leadActivitiesApi.create(data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.activityCreated'));
            qc.invalidateQueries({ queryKey: commercialKeys.activities.all });
            qc.invalidateQueries({ queryKey: commercialKeys.leads.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateLeadActivity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeadActivityDto> }) =>
            leadActivitiesApi.update(id, data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.activityUpdated'));
            qc.invalidateQueries({ queryKey: commercialKeys.activities.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteLeadActivity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => leadActivitiesApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.activityDeleted'));
            qc.invalidateQueries({ queryKey: commercialKeys.activities.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useClientActivitiesReport = (clientId: string, filters?: { dateFrom?: string; dateTo?: string }) =>
    useQuery({
        queryKey: commercialKeys.activities.clientReport(clientId, filters),
        queryFn: () => leadActivitiesApi.getClientActivitiesReport(clientId, filters),
        enabled: !!clientId,
    });

export const useClientHealthMetrics = (clientId: string) =>
    useQuery({
        queryKey: commercialKeys.activities.clientHealth(clientId),
        queryFn: () => leadActivitiesApi.getClientHealthMetrics(clientId),
        enabled: !!clientId,
    });

// ── Client Payments Hooks ──
export const useClientPayments = (filters?: any) =>
    useQuery({
        queryKey: commercialKeys.payments.list(filters),
        queryFn: () => clientPaymentsApi.getAll(filters),
    });

export const useClientStatement = (clientId: string) =>
    useQuery({
        queryKey: commercialKeys.payments.clientStatement(clientId),
        queryFn: () => clientPaymentsApi.getClientStatement(clientId),
        enabled: !!clientId,
    });

export const useSalesSummary = () =>
    useQuery({
        queryKey: commercialKeys.payments.salesSummary,
        queryFn: () => clientPaymentsApi.getSalesSummary(),
    });

export const useCreatePayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePaymentDto) => clientPaymentsApi.create(data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.paymentRecorded'));
            qc.invalidateQueries({ queryKey: commercialKeys.payments.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdatePayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreatePaymentDto> }) =>
            clientPaymentsApi.update(id, data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.paymentUpdated'));
            qc.invalidateQueries({ queryKey: commercialKeys.payments.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeletePayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => clientPaymentsApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.paymentDeleted'));
            qc.invalidateQueries({ queryKey: commercialKeys.payments.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

// ── Commercial Goals Hooks ──

export const useTeamPerformance = (params?: { year?: number; month?: number }) =>
    useQuery({
        queryKey: commercialKeys.goals.team(params),
        queryFn: () => commercialGoalsApi.getTeamPerformance(params),
        enabled: !!params,
    });

export const useEmployeeGoal = (params?: { employeeId: string; year?: number; month?: number }) =>
    useQuery({
        queryKey: [...commercialKeys.goals.all, 'employee', params] as const,
        queryFn: () => commercialGoalsApi.getEmployeeGoal(params!),
        enabled: !!params?.employeeId,
    });

export const useMyGoal = (params?: { year?: number; month?: number }) =>
    useQuery({
        queryKey: commercialKeys.goals.my(params),
        queryFn: () => commercialGoalsApi.getMyGoal(params),
        enabled: !!params,
    });

export const useSetGoal = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: SetGoalDto) => commercialGoalsApi.setGoal(data),
        onSuccess: () => {
            toast.success(i18n.t('commercial.toast.goalSaved', 'Objectif enregistré'));
            qc.invalidateQueries({ queryKey: commercialKeys.goals.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

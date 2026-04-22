import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, invoiceTemplatesApi } from './api';
import type { CreateInvoiceDto, UpdateInvoiceDto, UpsertInvoiceTemplateDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const invoiceKeys = {
    all: ['invoices'] as const,
    detail: (id: string) => ['invoices', id] as const,
    stats: ['invoices', 'stats'] as const,
    template: (deptId: string) => ['invoice-template', deptId] as const,
};

export const useInvoices = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? [...invoiceKeys.all, departmentId] : invoiceKeys.all,
        queryFn: () => invoicesApi.getAll(departmentId),
    });

export const useInvoice = (id: string) =>
    useQuery({
        queryKey: invoiceKeys.detail(id),
        queryFn: () => invoicesApi.getById(id),
        enabled: !!id,
    });

export const useInvoiceStats = (departmentId?: string, from?: string, to?: string) =>
    useQuery({
        queryKey: [...invoiceKeys.stats, departmentId, from, to].filter(Boolean),
        queryFn: () => invoicesApi.getStats(departmentId, from, to),
    });

export const useRevenueByDepartment = (from?: string, to?: string) =>
    useQuery({
        queryKey: ['invoices', 'revenue-by-department', from, to].filter(Boolean),
        queryFn: () => invoicesApi.getRevenueByDepartment(from, to),
    });

export const useCreateInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateInvoiceDto) => invoicesApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.invoiceCreated'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateInvoiceDto }) => invoicesApi.update(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.invoiceUpdated'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useSendInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => invoicesApi.send(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.invoiceSent'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => {
            toast.error(i18n.t('toast.error'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
    });
};

export const usePayInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => invoicesApi.pay(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.invoicePaid'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => {
            toast.error(i18n.t('toast.error'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
    });
};

export const useRejectInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => invoicesApi.reject(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.invoiceRejected'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => {
            toast.error(i18n.t('toast.error'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
    });
};

export const useCreateAcompte = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, amount }: { id: string; amount: number }) => invoicesApi.createAcompte(id, amount),
        onSuccess: () => {
            toast.success('Facture d\'acompte créée');
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useValidateProforma = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => invoicesApi.validateProforma(id),
        onSuccess: () => {
            toast.success('Proforma validé en facture');
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => invoicesApi.remove(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.invoiceDeleted'));
            qc.invalidateQueries({ queryKey: invoiceKeys.all });
            qc.invalidateQueries({ queryKey: invoiceKeys.stats });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useInvoiceTemplate = (departmentId: string) =>
    useQuery({
        queryKey: invoiceKeys.template(departmentId),
        queryFn: () => invoiceTemplatesApi.getByDepartment(departmentId),
        enabled: !!departmentId,
    });

export const useUpsertInvoiceTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ departmentId, dto }: { departmentId: string; dto: UpsertInvoiceTemplateDto }) =>
            invoiceTemplatesApi.upsert(departmentId, dto),
        onSuccess: (_, { departmentId }) => {
            toast.success(i18n.t('toast.templateSaved'));
            qc.invalidateQueries({ queryKey: invoiceKeys.template(departmentId) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

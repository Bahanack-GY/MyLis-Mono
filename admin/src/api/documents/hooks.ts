import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from './api';
import type { CreateDocumentDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const documentKeys = {
    all: ['documents'] as const,
    detail: (id: string) => ['documents', id] as const,
    storage: ['documents', 'storage'] as const,
};

export const useDocuments = () =>
    useQuery({
        queryKey: documentKeys.all,
        queryFn: documentsApi.getAll,
    });

export const useStorageInfo = () =>
    useQuery({
        queryKey: documentKeys.storage,
        queryFn: documentsApi.getStorageInfo,
    });

export const useDocument = (id: string) =>
    useQuery({
        queryKey: documentKeys.detail(id),
        queryFn: () => documentsApi.getById(id),
        enabled: !!id,
    });

export const useCreateDocument = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateDocumentDto) => documentsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.documentUploaded'));
            qc.invalidateQueries({ queryKey: documentKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteDocument = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => documentsApi.deleteDocument(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.documentDeleted'));
            qc.invalidateQueries({ queryKey: documentKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

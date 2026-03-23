import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentsApi } from './api';
import type { CreateDocumentDto } from './types';
import i18n from '../../i18n/config';

export const documentKeys = {
    all: ['documents'] as const,
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

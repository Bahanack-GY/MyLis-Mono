import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { demandsApi } from './api';
import type { CreateDemandDto } from './types';
import i18n from '../../i18n/config';

export const useMyDemands = () =>
    useQuery({
        queryKey: ['demands', 'my'],
        queryFn: demandsApi.getMyDemands,
    });

export const useCreateDemand = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateDemandDto) => demandsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.demandSubmitted'));
            qc.invalidateQueries({ queryKey: ['demands'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUploadProforma = () =>
    useMutation({
        mutationFn: (file: File) => demandsApi.uploadProforma(file),
        onSuccess: () => toast.success(i18n.t('toast.proformaUploaded')),
        onError: () => toast.error(i18n.t('toast.proformaFailed')),
    });

export const useUploadImage = () =>
    useMutation({
        mutationFn: (file: File) => demandsApi.uploadImage(file),
    });

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as taxApi from './api';

export const useTaxConfigs = () => useQuery({ queryKey: ['tax-configs'], queryFn: taxApi.getTaxConfigs });

export const useSeedTaxConfig = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: taxApi.seedTaxConfig,
        onSuccess: () => { toast.success('Configuration fiscale initialisée'); qc.invalidateQueries({ queryKey: ['tax-configs'] }); },
        onError: () => toast.error('Erreur'),
    });
};

export const useUpsertTaxConfig = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: taxApi.upsertTaxConfig,
        onSuccess: () => { toast.success('Configuration mise à jour'); qc.invalidateQueries({ queryKey: ['tax-configs'] }); },
        onError: () => toast.error('Erreur'),
    });
};

export const useTaxDeclarations = (fiscalYearId?: string) =>
    useQuery({ queryKey: ['tax-declarations', fiscalYearId], queryFn: () => taxApi.getTaxDeclarations(fiscalYearId) });
export const useUpcomingDeclarations = () =>
    useQuery({ queryKey: ['tax-declarations', 'upcoming'], queryFn: taxApi.getUpcomingDeclarations });
export const useTaxDeclaration = (id: string) =>
    useQuery({ queryKey: ['tax-declarations', id], queryFn: () => taxApi.getTaxDeclaration(id), enabled: !!id });

export const useGenerateTva = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ month, year }: { month: number; year: number }) => taxApi.generateTva(month, year),
        onSuccess: () => { toast.success('Déclaration TVA générée'); qc.invalidateQueries({ queryKey: ['tax-declarations'] }); },
        onError: () => toast.error('Erreur lors de la génération'),
    });
};

export const useGenerateIs = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: taxApi.generateIs,
        onSuccess: () => { toast.success('Déclaration IS générée'); qc.invalidateQueries({ queryKey: ['tax-declarations'] }); },
        onError: () => toast.error('Erreur lors de la génération'),
    });
};

export const useGenerateCnps = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ month, year }: { month: number; year: number }) => taxApi.generateCnps(month, year),
        onSuccess: () => { toast.success('Déclaration CNPS générée'); qc.invalidateQueries({ queryKey: ['tax-declarations'] }); },
        onError: () => toast.error('Erreur lors de la génération'),
    });
};

export const useValidateDeclaration = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: taxApi.validateDeclaration,
        onSuccess: () => { toast.success('Déclaration validée'); qc.invalidateQueries({ queryKey: ['tax-declarations'] }); },
        onError: () => toast.error('Erreur'),
    });
};

export const useMarkDeclarationFiled = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: taxApi.markDeclarationFiled,
        onSuccess: () => { toast.success('Déclaration marquée comme déposée'); qc.invalidateQueries({ queryKey: ['tax-declarations'] }); },
        onError: () => toast.error('Erreur'),
    });
};

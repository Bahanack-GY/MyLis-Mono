import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chargeNaturesApi } from './api';
import type { CreateChargeNatureDto } from './types';
import { toast } from 'sonner';

export const chargeNatureKeys = {
    families: ['charge-natures', 'families'] as const,
    all: (chargeFamily?: string) => ['charge-natures', chargeFamily] as const,
};

export const useChargeFamilies = () =>
    useQuery({
        queryKey: chargeNatureKeys.families,
        queryFn: () => chargeNaturesApi.getFamilies(),
        staleTime: Infinity,
    });

export const useChargeNatures = (chargeFamily?: string) =>
    useQuery({
        queryKey: chargeNatureKeys.all(chargeFamily),
        queryFn: () => chargeNaturesApi.getAll(chargeFamily),
        staleTime: 5 * 60 * 1000,
    });

export const useCreateChargeNature = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateChargeNatureDto) => chargeNaturesApi.create(dto),
        onSuccess: () => {
            toast.success('Nature de charge ajoutée');
            qc.invalidateQueries({ queryKey: ['charge-natures'] });
        },
        onError: () => toast.error('Erreur lors de la création'),
    });
};

export const useUpdateChargeNature = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateChargeNatureDto> }) =>
            chargeNaturesApi.update(id, dto),
        onSuccess: () => {
            toast.success('Nature de charge modifiée');
            qc.invalidateQueries({ queryKey: ['charge-natures'] });
        },
        onError: () => toast.error('Erreur lors de la modification'),
    });
};

export const useDeleteChargeNature = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => chargeNaturesApi.delete(id),
        onSuccess: () => {
            toast.success('Nature de charge supprimée');
            qc.invalidateQueries({ queryKey: ['charge-natures'] });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'Erreur lors de la suppression';
            toast.error(msg);
        },
    });
};

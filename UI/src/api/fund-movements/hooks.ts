import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundMovementsApi } from './api';
import type { CreateFundMovementDto } from './types';
import { toast } from 'sonner';

export const fundMovementKeys = {
    all: ['fund-movements'] as const,
    list: (params: any) => [...fundMovementKeys.all, params] as const,
};

export const useFundMovements = (params: { page?: number; limit?: number; type?: string; ceoUserId?: string } = {}) =>
    useQuery({
        queryKey: fundMovementKeys.list(params),
        queryFn: () => fundMovementsApi.getAll(params),
    });

export const useCreateFundMovement = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateFundMovementDto) => fundMovementsApi.create(dto),
        onSuccess: () => {
            toast.success('Mouvement enregistré avec succès');
            qc.invalidateQueries({ queryKey: fundMovementKeys.all });
        },
        onError: () => toast.error('Erreur lors de l\'enregistrement'),
    });
};

export const useDeleteFundMovement = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => fundMovementsApi.delete(id),
        onSuccess: () => {
            toast.success('Mouvement supprimé');
            qc.invalidateQueries({ queryKey: fundMovementKeys.all });
        },
        onError: () => toast.error('Erreur lors de la suppression'),
    });
};

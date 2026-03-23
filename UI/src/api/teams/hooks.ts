import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './api';
import type { CreateTeamDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const teamKeys = {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', id] as const,
};

export const useTeams = () =>
    useQuery({
        queryKey: teamKeys.all,
        queryFn: teamsApi.getAll,
    });

export const useTeam = (id: string) =>
    useQuery({
        queryKey: teamKeys.detail(id),
        queryFn: () => teamsApi.getById(id),
        enabled: !!id,
    });

export const useCreateTeam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTeamDto) => teamsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.teamCreated'));
            qc.invalidateQueries({ queryKey: teamKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

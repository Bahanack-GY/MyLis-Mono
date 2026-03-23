import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from './api';
import type { CreateTicketDto, TakeTicketDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const ticketKeys = {
    all: ['tickets'] as const,
    detail: (id: string) => ['tickets', id] as const,
    myTickets: ['tickets', 'my'] as const,
};

export const useTickets = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? [...ticketKeys.all, departmentId] : ticketKeys.all,
        queryFn: () => ticketsApi.getAll(departmentId),
    });

export const useTicket = (id: string) =>
    useQuery({
        queryKey: ticketKeys.detail(id),
        queryFn: () => ticketsApi.getById(id),
        enabled: !!id,
    });

export const useMyTickets = () =>
    useQuery({
        queryKey: ticketKeys.myTickets,
        queryFn: ticketsApi.getMyTickets,
    });

export const useCreateTicket = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTicketDto) => ticketsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.ticketCreated'));
            qc.invalidateQueries({ queryKey: ticketKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useTakeTicket = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: TakeTicketDto }) =>
            ticketsApi.take(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.ticketAccepted'));
            qc.invalidateQueries({ queryKey: ticketKeys.all });
        },
        onError: () => {
            toast.error(i18n.t('toast.error'));
            qc.invalidateQueries({ queryKey: ticketKeys.all });
        },
    });
};

export const useCloseTicket = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => ticketsApi.close(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.ticketClosed'));
            qc.invalidateQueries({ queryKey: ticketKeys.all });
        },
        onError: () => {
            toast.error(i18n.t('toast.error'));
            qc.invalidateQueries({ queryKey: ticketKeys.all });
        },
    });
};

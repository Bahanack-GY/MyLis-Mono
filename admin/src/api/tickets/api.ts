import api from '../config';
import type { Ticket, CreateTicketDto, TakeTicketDto } from './types';

export const ticketsApi = {
    getAll: (departmentId?: string) =>
        api.get<Ticket[]>('/tickets', { params: departmentId ? { departmentId } : {} }).then(r => r.data),

    getById: (id: string) =>
        api.get<Ticket>(`/tickets/${id}`).then(r => r.data),

    getMyTickets: () =>
        api.get<Ticket[]>('/tickets/my-tickets').then(r => r.data),

    create: (dto: CreateTicketDto) =>
        api.post<Ticket>('/tickets', dto).then(r => r.data),

    take: (id: string, dto: TakeTicketDto) =>
        api.patch<Ticket>(`/tickets/${id}/take`, dto).then(r => r.data),

    close: (id: string) =>
        api.patch<Ticket>(`/tickets/${id}/close`).then(r => r.data),
};

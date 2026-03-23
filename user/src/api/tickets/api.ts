import api from '../config';
import type { Ticket, CreateTicketDto } from './types';

export const ticketsApi = {
    getMyTickets: () =>
        api.get<Ticket[]>('/tickets/my-tickets').then(r => r.data),

    getDepartmentTickets: () =>
        api.get<Ticket[]>('/tickets/department').then(r => r.data),

    create: (dto: CreateTicketDto) =>
        api.post<Ticket>('/tickets', dto).then(r => r.data),

    accept: (ticketId: string) =>
        api.patch<Ticket>(`/tickets/${ticketId}/accept`).then(r => r.data),
};

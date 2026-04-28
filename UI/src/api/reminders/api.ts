import api from '../config';

export interface Reminder {
    id: string;
    userId: string;
    title: string;
    description?: string;
    dueDate: string;
    isCompleted: boolean;
    completedAt: string | null;
    createdAt: string;
}

export interface CreateReminderDto {
    title: string;
    description?: string;
    dueDate: string;
}

export const remindersApi = {
    getAll: (): Promise<Reminder[]> =>
        api.get('/reminders').then(r => r.data),

    create: (dto: CreateReminderDto): Promise<Reminder> =>
        api.post('/reminders', dto).then(r => r.data),

    markDone: (id: string): Promise<Reminder> =>
        api.patch(`/reminders/${id}/done`).then(r => r.data),

    remove: (id: string): Promise<void> =>
        api.delete(`/reminders/${id}`).then(r => r.data),
};

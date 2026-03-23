import api from '../config';
import type { LeaderboardEntry } from './types';

export interface BirthdayEmployee {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    departmentName: string;
}

export const employeesApi = {
    getLeaderboard: (limit: number = 5) =>
        api.get<LeaderboardEntry[]>('/employees/leaderboard', { params: { limit } }).then(r => r.data),

    getTodayBirthdays: () =>
        api.get<BirthdayEmployee[]>('/employees/birthdays/today').then(r => r.data),
};

import { useQuery } from '@tanstack/react-query';
import { employeesApi } from './api';

export const useLeaderboard = (limit: number = 5) =>
    useQuery({
        queryKey: ['leaderboard', limit],
        queryFn: () => employeesApi.getLeaderboard(limit),
    });

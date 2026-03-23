import { useQuery } from '@tanstack/react-query';
import { meetingsApi } from './api';

export const meetingKeys = {
    all: ['meetings'] as const,
    detail: (id: string) => ['meetings', id] as const,
};

export const useMeetings = () =>
    useQuery({
        queryKey: meetingKeys.all,
        queryFn: meetingsApi.getAll,
    });

export const useMeeting = (id: string) =>
    useQuery({
        queryKey: meetingKeys.detail(id),
        queryFn: () => meetingsApi.getById(id),
        enabled: !!id,
    });

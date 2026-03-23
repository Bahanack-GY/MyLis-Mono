import { useQuery } from '@tanstack/react-query';
import { sanctionsApi } from './api';

export const sanctionKeys = {
    my: ['sanctions', 'my'] as const,
};

export const useMySanctions = () =>
    useQuery({
        queryKey: sanctionKeys.my,
        queryFn: sanctionsApi.getMy,
    });

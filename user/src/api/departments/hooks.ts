import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from './api';

export const departmentKeys = {
    all: ['departments'] as const,
};

export const useDepartments = () =>
    useQuery({
        queryKey: departmentKeys.all,
        queryFn: departmentsApi.getAll,
    });

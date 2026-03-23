import { useQuery } from '@tanstack/react-query';
import api from './config';

export interface Project {
    id: string;
    name: string;
    description: string;
    clientId: string;
    departmentId: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    color?: string;
    client?: { id: string; name: string };
    department?: { id: string; name: string };
    tasks?: any[];
}

export const useProjects = () => {
    return useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: async () => {
            const { data } = await api.get('/projects');
            return data;
        },
    });
};

export const useProjectsByDepartment = (departmentId: string | undefined) => {
    return useQuery<Project[]>({
        queryKey: ['projects', 'department', departmentId],
        queryFn: async () => {
            if (!departmentId) return [];
            const { data } = await api.get(`/projects/department/${departmentId}`);
            return data;
        },
        enabled: !!departmentId,
    });
};

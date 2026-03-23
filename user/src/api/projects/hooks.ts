import { useQuery } from '@tanstack/react-query';
import { projectsApi } from './api';

export const projectKeys = {
    myProjects: ['projects', 'my'] as const,
    myProjectDetail: (id: string) => ['projects', 'my', id] as const,
};

export const useMyProjects = () =>
    useQuery({
        queryKey: projectKeys.myProjects,
        queryFn: projectsApi.getMyProjects,
    });

export const useMyProjectDetail = (id: string) =>
    useQuery({
        queryKey: projectKeys.myProjectDetail(id),
        queryFn: () => projectsApi.getMyProjectDetail(id),
        enabled: !!id,
    });

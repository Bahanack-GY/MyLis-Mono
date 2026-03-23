import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './api';
import type { CreateTaskDto, UpdateTaskDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const taskKeys = {
    all: ['tasks'] as const,
    detail: (id: string) => ['tasks', id] as const,
    myTasks: ['tasks', 'my'] as const,
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
};

export const useTasks = (departmentId?: string, from?: string, to?: string) =>
    useQuery({
        queryKey: [...taskKeys.all, departmentId, from, to].filter(Boolean),
        queryFn: () => tasksApi.getAll(departmentId, from, to),
    });

export const useTask = (id: string) =>
    useQuery({
        queryKey: taskKeys.detail(id),
        queryFn: () => tasksApi.getById(id),
        enabled: !!id,
    });

export const useMyTasks = () =>
    useQuery({
        queryKey: taskKeys.myTasks,
        queryFn: tasksApi.getMyTasks,
    });

export const useCreateTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTaskDto) => tasksApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskCreated'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateTaskDto }) =>
            tasksApi.update(id, dto),
        onSuccess: (_, { id }) => {
            toast.success(i18n.t('toast.taskUpdated'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useTasksByProject = (projectId: string) =>
    useQuery({
        queryKey: taskKeys.byProject(projectId),
        queryFn: () => tasksApi.getByProject(projectId),
        enabled: !!projectId,
    });

export const useDeleteTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tasksApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskDeleted'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useTaskHistory = (taskId: string | null) =>
    useQuery({
        queryKey: [...taskKeys.all, 'history', taskId],
        queryFn: () => tasksApi.getHistory(taskId!),
        enabled: !!taskId,
    });

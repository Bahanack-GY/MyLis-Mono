import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './api';
import type { CreateTaskDto, UpdateTaskDto, SelfAssignTaskDto, Task, TaskState } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';
import { useSSE } from '../../hooks/useSSE';

export type { SelfAssignTaskDto };

export const taskKeys = {
    all: ['tasks'] as const,
    detail: (id: string) => ['tasks', id] as const,
    myTasks: ['tasks', 'my'] as const,
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
    byEmployee: (employeeId: string) => ['tasks', 'employee', employeeId] as const,
    weeklyCheckEmployee: (employeeId: string) => ['tasks', 'weekly-check', employeeId] as const,
    myWeek: (start: string) => ['tasks', 'my-week', start] as const,
    weekByEmployee: (employeeId: string, start: string) => ['tasks', 'week', employeeId, start] as const,
    allWeek: (start: string) => ['tasks', 'all-week', start] as const,
};

export const useTasks = (departmentId?: string, from?: string, to?: string) => {
    useSSE('/tasks/sse', [taskKeys.all, taskKeys.myTasks]);
    return useQuery({
        queryKey: [...taskKeys.all, departmentId, from, to].filter(Boolean),
        queryFn: () => tasksApi.getAll(departmentId, from, to),
    });
};

export const useTask = (id: string) =>
    useQuery({
        queryKey: taskKeys.detail(id),
        queryFn: () => tasksApi.getById(id),
        enabled: !!id,
    });

export const useMyTasks = () => {
    useSSE('/tasks/sse', [taskKeys.all, taskKeys.myTasks]);
    return useQuery({
        queryKey: taskKeys.myTasks,
        queryFn: tasksApi.getMyTasks,
    });
};

export const useCreateTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTaskDto) => tasksApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskCreated'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: ['tasks', 'my-week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'all-week'] });
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
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
            qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
            qc.invalidateQueries({ queryKey: ['tasks', 'my-week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'all-week'] });
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

export const useTasksByLead = (leadId: string) =>
    useQuery({
        queryKey: ['tasks', 'lead', leadId] as const,
        queryFn: () => tasksApi.getByLead(leadId),
        enabled: !!leadId,
    });

export const useDeleteTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tasksApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskDeleted'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
            qc.invalidateQueries({ queryKey: ['tasks', 'my-week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'all-week'] });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateTaskState = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, state, blockReason }: { taskId: string; state: string; blockReason?: string }) =>
            tasksApi.updateState(taskId, state, blockReason),
        onMutate: async ({ taskId, state }) => {
            await qc.cancelQueries({ queryKey: taskKeys.myTasks });
            const previous = qc.getQueryData<Task[]>(taskKeys.myTasks);
            if (previous) {
                qc.setQueryData<Task[]>(taskKeys.myTasks, old =>
                    old?.map(t => t.id === taskId ? { ...t, state: state as TaskState } : t),
                );
            }
            return { previous };
        },
        onSuccess: () => {
            toast.success(i18n.t('toast.taskUpdated'));
        },
        onError: (_err, _vars, context) => {
            toast.error(i18n.t('toast.error'));
            if (context?.previous) {
                qc.setQueryData(taskKeys.myTasks, context.previous);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
    });
};

export const useSelfAssignTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: SelfAssignTaskDto) => tasksApi.selfAssign(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.taskAssigned'));
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
            qc.invalidateQueries({ queryKey: ['tasks', 'my-week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'week'] });
            qc.invalidateQueries({ queryKey: ['tasks', 'all-week'] });
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

export const useWeeklyCheckForEmployee = (employeeId: string | null) =>
    useQuery({
        queryKey: taskKeys.weeklyCheckEmployee(employeeId || ''),
        queryFn: () => tasksApi.weeklyCheckForEmployee(employeeId!),
        enabled: !!employeeId,
        staleTime: 30_000,
    });

export const useMyWeekTasks = (weekStartDate: string) =>
    useQuery({
        queryKey: taskKeys.myWeek(weekStartDate),
        queryFn: () => tasksApi.getMyWeek(weekStartDate),
        enabled: !!weekStartDate,
    });

export const useWeekTasksByEmployee = (employeeId: string, weekStartDate: string) =>
    useQuery({
        queryKey: taskKeys.weekByEmployee(employeeId, weekStartDate),
        queryFn: () => tasksApi.getWeekByEmployee(employeeId, weekStartDate),
        enabled: !!employeeId && !!weekStartDate,
    });

export const useAllWeekTasks = (weekStartDate: string) =>
    useQuery({
        queryKey: taskKeys.allWeek(weekStartDate),
        queryFn: () => tasksApi.getAllWeek(weekStartDate),
        enabled: !!weekStartDate,
    });

// Subtask hooks
export const useCreateSubtask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
            tasksApi.createSubtask(taskId, title),
        onSuccess: (_, { taskId }) => {
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
            qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateSubtask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: { title?: string; completed?: boolean; order?: number } }) =>
            tasksApi.updateSubtask(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteSubtask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tasksApi.deleteSubtask(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useToggleSubtask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tasksApi.toggleSubtask(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useReorderSubtasks = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, subtaskIds }: { taskId: string; subtaskIds: string[] }) =>
            tasksApi.reorderSubtasks(taskId, subtaskIds),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

// Attachment hooks
export const useUploadTaskAttachment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
            tasksApi.uploadAttachment(taskId, file),
        onSuccess: () => {
            toast.success(i18n.t('toast.attachmentUploaded'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteTaskAttachment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
            tasksApi.deleteAttachment(taskId, attachmentId),
        onSuccess: () => {
            toast.success(i18n.t('toast.attachmentDeleted'));
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useTimeDistribution = (employeeId: string) =>
    useQuery({
        queryKey: ['tasks', 'time-distribution', employeeId] as const,
        queryFn: () => tasksApi.getTimeDistribution(employeeId),
        enabled: !!employeeId,
    });

export const useTransferTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, targetWeekStart }: { taskId: string; targetWeekStart: string }) =>
            tasksApi.transferTask(taskId, targetWeekStart),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: taskKeys.all });
            qc.invalidateQueries({ queryKey: taskKeys.myTasks });
            qc.invalidateQueries({ queryKey: taskKeys.myWeek });
            qc.invalidateQueries({ queryKey: taskKeys.weeklyCheck });
            toast.success(i18n.t('toast.taskTransferred'));
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || i18n.t('toast.error'));
        },
    });
};

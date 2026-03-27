import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from './api';
import type { CreateMeetingDto, UpdateMeetingDto } from './types';
import { toast } from 'sonner';
import i18n from '../../i18n/config';

export const meetingKeys = {
    all: ['meetings'] as const,
    detail: (id: string) => ['meetings', id] as const,
};

export const useMeetings = (departmentId?: string) =>
    useQuery({
        queryKey: departmentId ? [...meetingKeys.all, departmentId] : meetingKeys.all,
        queryFn: () => meetingsApi.getAll(departmentId),
    });

export const useMeeting = (id: string) =>
    useQuery({
        queryKey: meetingKeys.detail(id),
        queryFn: () => meetingsApi.getById(id),
        enabled: !!id,
    });

export const useCreateMeeting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateMeetingDto) => meetingsApi.create(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.meetingScheduled'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUpdateMeeting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateMeetingDto }) =>
            meetingsApi.update(id, dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.meetingUpdated'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useDeleteMeeting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => meetingsApi.remove(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.meetingDeleted'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useStartMeeting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, secretaryId }: { id: string; secretaryId: string }) =>
            meetingsApi.startMeeting(id, secretaryId),
        onSuccess: () => {
            toast.success(i18n.t('toast.meetingStarted'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useEndMeeting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => meetingsApi.endMeeting(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.meetingEnded'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useAttendMeeting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => meetingsApi.attend(id),
        onSuccess: () => {
            toast.success(i18n.t('toast.attendanceMarked'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useUploadRecording = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, audioBlob }: { id: string; audioBlob: Blob }) =>
            meetingsApi.uploadRecording(id, audioBlob),
        onSuccess: () => {
            toast.success(i18n.t('toast.transcriptionComplete'));
            qc.invalidateQueries({ queryKey: meetingKeys.all });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

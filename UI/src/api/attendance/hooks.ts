import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { attendanceApi } from './api';

const KEYS = {
    months: ['attendance', 'months'] as const,
    byMonth: (y: number, m: number) => ['attendance', 'month', y, m] as const,
};

export const useAttendanceMonths = () =>
    useQuery({ queryKey: KEYS.months, queryFn: attendanceApi.listMonths });

export const useAttendanceMonth = (year: number | null, month: number | null) =>
    useQuery({
        queryKey: KEYS.byMonth(year ?? 0, month ?? 0),
        queryFn: () => attendanceApi.getByMonth(year!, month!),
        enabled: !!year && !!month,
    });

export const useUploadAttendance = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => attendanceApi.upload(file),
        onSuccess: (data) => {
            toast.success(`Présences importées (${data.employeeCount} employés)`);
            qc.invalidateQueries({ queryKey: ['attendance'] });
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.message || 'Échec de l\'import du fichier';
            toast.error(typeof msg === 'string' ? msg : 'Échec de l\'import du fichier');
        },
    });
};

export const useDeleteAttendanceMonth = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ year, month }: { year: number; month: number }) =>
            attendanceApi.deleteMonth(year, month),
        onSuccess: () => {
            toast.success('Période supprimée');
            qc.invalidateQueries({ queryKey: ['attendance'] });
        },
        onError: () => toast.error('Erreur lors de la suppression'),
    });
};

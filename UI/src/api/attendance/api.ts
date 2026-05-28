import api from '../config';
import type { AttendanceMonth, AttendanceMonthSummary } from './types';

export const attendanceApi = {
    listMonths: (): Promise<AttendanceMonthSummary[]> =>
        api.get('/attendance/months').then(r => r.data),

    getByMonth: (year: number, month: number): Promise<AttendanceMonth> =>
        api.get(`/attendance/${year}/${month}`).then(r => r.data),

    upload: (file: File): Promise<AttendanceMonth> => {
        const form = new FormData();
        form.append('file', file);
        return api
            .post('/attendance/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then(r => r.data);
    },

    deleteMonth: (year: number, month: number): Promise<{ ok: true }> =>
        api.delete(`/attendance/${year}/${month}`).then(r => r.data),
};

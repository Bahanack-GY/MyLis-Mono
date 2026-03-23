import api from '../config';
import type { SalaryEmployee, PayBulkResult, PayOneResult, AdvanceResult } from './types';

export const salaryApi = {
    getAll: () =>
        api.get<SalaryEmployee[]>('/salary').then(r => r.data),

    update: (employeeId: string, salary: number) =>
        api.patch<{ id: string; salary: number }>(`/salary/${employeeId}`, { salary }).then(r => r.data),

    payBulk: (month: number, year: number) =>
        api.post<PayBulkResult>('/salary/pay', { month, year }).then(r => r.data),

    payOne: (employeeId: string, month: number, year: number) =>
        api.post<PayOneResult>(`/salary/pay/${employeeId}`, { month, year }).then(r => r.data),

    payAdvance: (employeeId: string, amount: number, note?: string) =>
        api.post<AdvanceResult>(`/salary/advance/${employeeId}`, { amount, note }).then(r => r.data),
};

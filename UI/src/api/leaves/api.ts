import api from '../config';
import type { LeaveRequest, LeaveBalance, CreateLeaveDto } from './types';

const BASE = '/leaves';

export const leavesApi = {
  create: (dto: CreateLeaveDto) =>
    api.post<LeaveRequest>(BASE, dto).then(r => r.data),

  findAll: (params?: { status?: string; employeeId?: string }) =>
    api.get<LeaveRequest[]>(BASE, { params }).then(r => r.data),

  findMy: () =>
    api.get<LeaveRequest[]>(`${BASE}/my`).then(r => r.data),

  getMyBalance: (year?: number) =>
    api.get<LeaveBalance>(`${BASE}/my/balance`, { params: { year } }).then(r => r.data),

  getBalance: (employeeId: string, year?: number) =>
    api.get<LeaveBalance>(`${BASE}/balance/${employeeId}`, { params: { year } }).then(r => r.data),

  updateBalance: (employeeId: string, year: number, totalDays: number) =>
    api.patch<LeaveBalance>(`${BASE}/balance/${employeeId}`, { year, totalDays }).then(r => r.data),

  approve: (id: string) =>
    api.patch<LeaveRequest>(`${BASE}/${id}/approve`).then(r => r.data),

  reject: (id: string, rejectionReason: string) =>
    api.patch<LeaveRequest>(`${BASE}/${id}/reject`, { rejectionReason }).then(r => r.data),
};

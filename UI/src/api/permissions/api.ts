import api from '../config';
import type { PermissionRequest, CreatePermissionDto } from './types';

const BASE = '/permissions';

export const permissionsApi = {
  create: (dto: CreatePermissionDto) =>
    api.post<PermissionRequest>(BASE, dto).then(r => r.data),

  findAll: (params?: { status?: string; employeeId?: string }) =>
    api.get<PermissionRequest[]>(BASE, { params }).then(r => r.data),

  findMy: () =>
    api.get<PermissionRequest[]>(`${BASE}/my`).then(r => r.data),

  approve: (id: string) =>
    api.patch<PermissionRequest>(`${BASE}/${id}/approve`).then(r => r.data),

  reject: (id: string, rejectionReason: string) =>
    api.patch<PermissionRequest>(`${BASE}/${id}/reject`, { rejectionReason }).then(r => r.data),
};

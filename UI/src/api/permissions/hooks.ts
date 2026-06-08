import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from './api';
import type { CreatePermissionDto } from './types';

export const usePermissions = (params?: { status?: string; employeeId?: string }) =>
  useQuery({ queryKey: ['permissions', params], queryFn: () => permissionsApi.findAll(params) });

export const useMyPermissions = () =>
  useQuery({ queryKey: ['permissions', 'my'], queryFn: permissionsApi.findMy });

export const useCreatePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePermissionDto) => permissionsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
};

export const useApprovePermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permissionsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
};

export const useRejectPermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => permissionsApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  });
};

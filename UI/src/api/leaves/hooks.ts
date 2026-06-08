import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi } from './api';
import type { CreateLeaveDto } from './types';

export const useLeaves = (params?: { status?: string; employeeId?: string }) =>
  useQuery({ queryKey: ['leaves', params], queryFn: () => leavesApi.findAll(params) });

export const useMyLeaves = () =>
  useQuery({ queryKey: ['leaves', 'my'], queryFn: leavesApi.findMy });

export const useMyLeaveBalance = (year?: number) =>
  useQuery({ queryKey: ['leave-balance', 'my', year], queryFn: () => leavesApi.getMyBalance(year) });

export const useLeaveBalance = (employeeId: string, year?: number) =>
  useQuery({
    queryKey: ['leave-balance', employeeId, year],
    queryFn: () => leavesApi.getBalance(employeeId, year),
    enabled: !!employeeId,
  });

export const useCreateLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLeaveDto) => leavesApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
};

export const useApproveLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leavesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });
};

export const useRejectLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => leavesApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
};

export const useUpdateLeaveBalance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, year, totalDays }: { employeeId: string; year: number; totalDays: number }) =>
      leavesApi.updateBalance(employeeId, year, totalDays),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-balance'] }),
  });
};

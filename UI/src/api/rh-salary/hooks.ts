import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRhSalaryPreview, applyRhSalary, fetchAppliedComponents } from './api';
import type { PointsBracket, ApplyPayload } from './types';

export function useRhSalaryPreview(params: {
  month: number;
  year: number;
  workDays?: number;
  brackets?: PointsBracket[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['rh-salary-preview', params.month, params.year, params.workDays, params.brackets],
    queryFn: () => fetchRhSalaryPreview(params),
    enabled: params.enabled !== false && !!params.month && !!params.year,
    staleTime: 60_000,
  });
}

export function useApplyRhSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyPayload) => applyRhSalary(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['rh-salary-preview', vars.month, vars.year] });
      qc.invalidateQueries({ queryKey: ['rh-salary-applied', vars.month, vars.year] });
      qc.invalidateQueries({ queryKey: ['salary-components'] });
    },
  });
}

export function useAppliedComponents(month: number, year: number) {
  return useQuery({
    queryKey: ['rh-salary-applied', month, year],
    queryFn: () => fetchAppliedComponents(month, year),
    enabled: !!month && !!year,
  });
}

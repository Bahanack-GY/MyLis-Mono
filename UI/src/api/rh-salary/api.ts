import api from '../config';
import type { PreviewResult, ApplyPayload, PointsBracket } from './types';

export async function fetchRhSalaryPreview(params: {
  month: number;
  year: number;
  workDays?: number;
  brackets?: PointsBracket[];
  employeeIds?: string[];
}): Promise<PreviewResult> {
  const query = new URLSearchParams({
    month: String(params.month),
    year: String(params.year),
  });
  if (params.workDays) query.set('workDays', String(params.workDays));
  if (params.brackets) query.set('brackets', JSON.stringify(params.brackets));
  if (params.employeeIds?.length) query.set('employeeIds', params.employeeIds.join(','));
  const res = await api.get(`/rh-salary/preview?${query}`);
  return res.data;
}

export async function applyRhSalary(payload: ApplyPayload): Promise<{ applied: number }> {
  const res = await api.post('/rh-salary/apply', payload);
  return res.data;
}

export async function fetchAppliedComponents(month: number, year: number) {
  const res = await api.get(`/rh-salary/applied?month=${month}&year=${year}`);
  return res.data;
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as payrollApi from './api';

export const usePayrollRuns = () => useQuery({ queryKey: ['payroll-runs'], queryFn: payrollApi.getPayrollRuns });
export const usePayrollRun = (id: string) => useQuery({ queryKey: ['payroll-runs', id], queryFn: () => payrollApi.getPayrollRun(id), enabled: !!id });
export const usePayslip = (id: string) => useQuery({ queryKey: ['payslips', id], queryFn: () => payrollApi.getPayslip(id), enabled: !!id });

export const useCreatePayrollRun = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: payrollApi.createPayrollRun,
        onSuccess: () => { toast.success('Session de paie créée'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Erreur lors de la création'),
    });
};

export const useCalculatePayrollRun = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: payrollApi.calculatePayrollRun,
        onSuccess: () => { toast.success('Calculs effectués'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Erreur lors du calcul'),
    });
};

export const useValidatePayrollRun = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: payrollApi.validatePayrollRun,
        onSuccess: () => { toast.success('Session validée'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Erreur lors de la validation'),
    });
};

export const usePayPayrollRun = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: payrollApi.payPayrollRun,
        onSuccess: () => { toast.success('Paie effectuée'); qc.invalidateQueries({ queryKey: ['payroll-runs'] }); },
        onError: () => toast.error('Erreur lors du paiement'),
    });
};

export const usePreviewPayroll = () => useMutation({ mutationFn: payrollApi.previewPayroll });

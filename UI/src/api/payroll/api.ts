import api from '../config';

export const getPayrollRuns = () => api.get('/payroll/runs').then(r => r.data);
export const getPayrollRun = (id: string) => api.get(`/payroll/runs/${id}`).then(r => r.data);
export const getPayslip = (id: string) => api.get(`/payroll/payslips/${id}`).then(r => r.data);
export const createPayrollRun = (data: { month: number; year: number }) => api.post('/payroll/runs', data).then(r => r.data);
export const calculatePayrollRun = (id: string) => api.post(`/payroll/runs/${id}/calculate`).then(r => r.data);
export const validatePayrollRun = (id: string) => api.post(`/payroll/runs/${id}/validate`).then(r => r.data);
export const payPayrollRun = (id: string) => api.post(`/payroll/runs/${id}/pay`).then(r => r.data);
export const previewPayroll = (grossSalary: number) => api.post('/payroll/preview', { grossSalary }).then(r => r.data);

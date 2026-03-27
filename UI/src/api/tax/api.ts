import api from '../config';

export const getTaxConfigs = () => api.get('/tax/config').then(r => r.data);
export const upsertTaxConfig = (data: any) => api.post('/tax/config', data).then(r => r.data);
export const seedTaxConfig = () => api.post('/tax/config/seed').then(r => r.data);

export const getTaxDeclarations = (fiscalYearId?: string) =>
    api.get('/tax/declarations', { params: { fiscalYearId } }).then(r => r.data);
export const getUpcomingDeclarations = () => api.get('/tax/declarations/upcoming').then(r => r.data);
export const getTaxDeclaration = (id: string) => api.get(`/tax/declarations/${id}`).then(r => r.data);
export const generateTva = (month: number, year: number) => api.post('/tax/declarations/generate/tva', { month, year }).then(r => r.data);
export const generateIs = (fiscalYearId: string) => api.post('/tax/declarations/generate/is', { fiscalYearId }).then(r => r.data);
export const generateCnps = (month: number, year: number) => api.post('/tax/declarations/generate/cnps', { month, year }).then(r => r.data);
export const validateDeclaration = (id: string) => api.post(`/tax/declarations/${id}/validate`).then(r => r.data);
export const markDeclarationFiled = (id: string) => api.post(`/tax/declarations/${id}/filed`).then(r => r.data);

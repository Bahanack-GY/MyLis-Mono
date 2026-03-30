import api from '../config';

// Seed
export const seedAccounting = () => api.post('/accounting/seed').then(r => r.data);

// Accounts
export const getAccounts = () => api.get('/accounting/accounts').then(r => r.data);
export const getAccountsTree = () => api.get('/accounting/accounts/tree').then(r => r.data);
export const getAccount = (id: string) => api.get(`/accounting/accounts/${id}`).then(r => r.data);
export const createAccount = (data: any) => api.post('/accounting/accounts', data).then(r => r.data);
export const updateAccount = (id: string, data: any) => api.patch(`/accounting/accounts/${id}`, data).then(r => r.data);
export const deleteAccount = (id: string) => api.delete(`/accounting/accounts/${id}`).then(r => r.data);

// Categories
export const getCategories = () => api.get('/accounting/categories').then(r => r.data);

// Journals
export const getJournals = () => api.get('/accounting/journals').then(r => r.data);
export const createJournal = (data: any) => api.post('/accounting/journals', data).then(r => r.data);

// Journal Entries
export const getJournalEntries = (params?: any) => api.get('/accounting/entries', { params }).then(r => r.data);
export const getJournalEntry = (id: string) => api.get(`/accounting/entries/${id}`).then(r => r.data);
export const createJournalEntry = (data: any) => api.post('/accounting/entries', data).then(r => r.data);
export const validateJournalEntry = (id: string) => api.post(`/accounting/entries/${id}/validate`).then(r => r.data);
export const deleteJournalEntry = (id: string) => api.delete(`/accounting/entries/${id}`).then(r => r.data);

// Fiscal Years
export const getFiscalYears = () => api.get('/accounting/fiscal-years').then(r => r.data);
export const getOpenFiscalYear = () => api.get('/accounting/fiscal-years/open').then(r => r.data);
export const getFiscalYear = (id: string) => api.get(`/accounting/fiscal-years/${id}`).then(r => r.data);
export const createFiscalYear = (data: any) => api.post('/accounting/fiscal-years', data).then(r => r.data);
export const closeFiscalYear = (id: string) => api.post(`/accounting/fiscal-years/${id}/close`).then(r => r.data);
export const reopenFiscalYear = (id: string) => api.post(`/accounting/fiscal-years/${id}/reopen`).then(r => r.data);

// Reports
export const getGrandLivre = (fiscalYearId: string, accountId?: string) =>
    api.get(`/accounting/reports/grand-livre/${fiscalYearId}`, { params: { accountId } }).then(r => r.data);
export const getTrialBalance = (fiscalYearId: string) =>
    api.get(`/accounting/reports/trial-balance/${fiscalYearId}`).then(r => r.data);
export const getBalanceSheet = (fiscalYearId: string) =>
    api.get(`/accounting/reports/balance-sheet/${fiscalYearId}`).then(r => r.data);
export const getIncomeStatement = (fiscalYearId: string) =>
    api.get(`/accounting/reports/income-statement/${fiscalYearId}`).then(r => r.data);
export const getDashboardKpis = (fiscalYearId: string) =>
    api.get(`/accounting/reports/dashboard-kpis/${fiscalYearId}`).then(r => r.data);
export const getMonthlySummary = (fiscalYearId: string) =>
    api.get(`/accounting/reports/monthly-summary/${fiscalYearId}`).then(r => r.data);

// Credit Notes
export const getCreditNotes = (invoiceId?: string) =>
    api.get('/accounting/credit-notes', { params: { invoiceId } }).then(r => r.data);
export const createCreditNote = (data: any) => api.post('/accounting/credit-notes', data).then(r => r.data);
export const validateCreditNote = (id: string) => api.post(`/accounting/credit-notes/${id}/validate`).then(r => r.data);

export const getCashFlow = (fiscalYearId: string) =>
    api.get(`/accounting/reports/cash-flow/${fiscalYearId}`).then(r => r.data);

// Budgets
export const getBudgets = (fiscalYearId: string) =>
    api.get('/accounting/budgets', { params: { fiscalYearId } }).then(r => r.data);
export const getBudgetVariance = (fiscalYearId: string) =>
    api.get('/accounting/budgets/variance', { params: { fiscalYearId } }).then(r => r.data);
export const createBudget = (data: any) => api.post('/accounting/budgets', data).then(r => r.data);
export const updateBudget = (id: string, data: any) => api.patch(`/accounting/budgets/${id}`, data).then(r => r.data);
export const deleteBudget = (id: string) => api.delete(`/accounting/budgets/${id}`).then(r => r.data);

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as accountingApi from './api';

// Accounts
export const useAccounts = () => useQuery({ queryKey: ['accounts'], queryFn: accountingApi.getAccounts });
export const useAccountsTree = () => useQuery({ queryKey: ['accounts', 'tree'], queryFn: accountingApi.getAccountsTree });
export const useAccount = (id: string) => useQuery({ queryKey: ['accounts', id], queryFn: () => accountingApi.getAccount(id), enabled: !!id });

export const useSeedAccounting = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.seedAccounting,
        onSuccess: () => { toast.success('Plan comptable SYSCOHADA initialisé'); qc.invalidateQueries({ queryKey: ['accounts'] }); },
        onError: () => toast.error('Erreur lors de l\'initialisation'),
    });
};

export const useCreateAccount = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.createAccount,
        onSuccess: () => { toast.success('Compte créé'); qc.invalidateQueries({ queryKey: ['accounts'] }); },
        onError: () => toast.error('Erreur lors de la création du compte'),
    });
};

export const useUpdateAccount = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => accountingApi.updateAccount(id, data),
        onSuccess: () => { toast.success('Compte modifié'); qc.invalidateQueries({ queryKey: ['accounts'] }); },
        onError: () => toast.error('Erreur lors de la modification'),
    });
};

export const useDeleteAccount = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.deleteAccount,
        onSuccess: () => { toast.success('Compte supprimé'); qc.invalidateQueries({ queryKey: ['accounts'] }); },
        onError: () => toast.error('Erreur lors de la suppression'),
    });
};

// Journals
export const useJournals = () => useQuery({ queryKey: ['journals'], queryFn: accountingApi.getJournals });

// Journal Entries
export const useJournalEntries = (params?: any) =>
    useQuery({ queryKey: ['journal-entries', params], queryFn: () => accountingApi.getJournalEntries(params) });
export const useJournalEntry = (id: string) =>
    useQuery({ queryKey: ['journal-entries', id], queryFn: () => accountingApi.getJournalEntry(id), enabled: !!id });

export const useCreateJournalEntry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.createJournalEntry,
        onSuccess: () => { toast.success('Écriture créée'); qc.invalidateQueries({ queryKey: ['journal-entries'] }); },
        onError: () => toast.error('Erreur lors de la création de l\'écriture'),
    });
};

export const useValidateJournalEntry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.validateJournalEntry,
        onSuccess: () => { toast.success('Écriture validée'); qc.invalidateQueries({ queryKey: ['journal-entries'] }); },
        onError: () => toast.error('Erreur lors de la validation'),
    });
};

export const useDeleteJournalEntry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.deleteJournalEntry,
        onSuccess: () => { toast.success('Écriture supprimée'); qc.invalidateQueries({ queryKey: ['journal-entries'] }); },
        onError: () => toast.error('Erreur lors de la suppression'),
    });
};

// Fiscal Years
export const useFiscalYears = () => useQuery({ queryKey: ['fiscal-years'], queryFn: accountingApi.getFiscalYears });
export const useOpenFiscalYear = () => useQuery({ queryKey: ['fiscal-years', 'open'], queryFn: accountingApi.getOpenFiscalYear });

export const useCreateFiscalYear = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.createFiscalYear,
        onSuccess: () => { toast.success('Exercice créé'); qc.invalidateQueries({ queryKey: ['fiscal-years'] }); },
        onError: () => toast.error('Erreur lors de la création de l\'exercice'),
    });
};

export const useCloseFiscalYear = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.closeFiscalYear,
        onSuccess: () => { toast.success('Exercice clôturé'); qc.invalidateQueries({ queryKey: ['fiscal-years'] }); },
        onError: () => toast.error('Erreur lors de la clôture'),
    });
};

export const useReopenFiscalYear = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.reopenFiscalYear,
        onSuccess: () => { toast.success('Exercice réouvert'); qc.invalidateQueries({ queryKey: ['fiscal-years'] }); },
        onError: () => toast.error('Erreur lors de la réouverture'),
    });
};

// Reports
export const useGrandLivre = (fiscalYearId: string, accountId?: string) =>
    useQuery({ queryKey: ['grand-livre', fiscalYearId, accountId], queryFn: () => accountingApi.getGrandLivre(fiscalYearId, accountId), enabled: !!fiscalYearId });
export const useTrialBalance = (fiscalYearId: string) =>
    useQuery({ queryKey: ['trial-balance', fiscalYearId], queryFn: () => accountingApi.getTrialBalance(fiscalYearId), enabled: !!fiscalYearId });
export const useBalanceSheet = (fiscalYearId: string) =>
    useQuery({ queryKey: ['balance-sheet', fiscalYearId], queryFn: () => accountingApi.getBalanceSheet(fiscalYearId), enabled: !!fiscalYearId });
export const useIncomeStatement = (fiscalYearId: string) =>
    useQuery({ queryKey: ['income-statement', fiscalYearId], queryFn: () => accountingApi.getIncomeStatement(fiscalYearId), enabled: !!fiscalYearId });
export const useDashboardKpis = (fiscalYearId: string) =>
    useQuery({ queryKey: ['dashboard-kpis', fiscalYearId], queryFn: () => accountingApi.getDashboardKpis(fiscalYearId), enabled: !!fiscalYearId });
export const useMonthlySummary = (fiscalYearId: string) =>
    useQuery({ queryKey: ['monthly-summary', fiscalYearId], queryFn: () => accountingApi.getMonthlySummary(fiscalYearId), enabled: !!fiscalYearId });

// Credit Notes
export const useCreditNotes = (invoiceId?: string) =>
    useQuery({ queryKey: ['credit-notes', invoiceId], queryFn: () => accountingApi.getCreditNotes(invoiceId) });

export const useCreateCreditNote = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.createCreditNote,
        onSuccess: () => { toast.success('Avoir créé'); qc.invalidateQueries({ queryKey: ['credit-notes'] }); },
        onError: () => toast.error('Erreur lors de la création de l\'avoir'),
    });
};

export const useValidateCreditNote = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.validateCreditNote,
        onSuccess: () => { toast.success('Avoir validé'); qc.invalidateQueries({ queryKey: ['credit-notes'] }); },
        onError: () => toast.error('Erreur lors de la validation'),
    });
};

// Budgets
export const useBudgets = (fiscalYearId: string) =>
    useQuery({ queryKey: ['budgets', fiscalYearId], queryFn: () => accountingApi.getBudgets(fiscalYearId), enabled: !!fiscalYearId });
export const useBudgetVariance = (fiscalYearId: string) =>
    useQuery({ queryKey: ['budget-variance', fiscalYearId], queryFn: () => accountingApi.getBudgetVariance(fiscalYearId), enabled: !!fiscalYearId });

export const useCreateBudget = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.createBudget,
        onSuccess: () => { toast.success('Budget créé'); qc.invalidateQueries({ queryKey: ['budgets'] }); },
        onError: () => toast.error('Erreur lors de la création du budget'),
    });
};

export const useUpdateBudget = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => accountingApi.updateBudget(id, data),
        onSuccess: () => { toast.success('Budget modifié'); qc.invalidateQueries({ queryKey: ['budgets'] }); },
        onError: () => toast.error('Erreur lors de la modification'),
    });
};

export const useDeleteBudget = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: accountingApi.deleteBudget,
        onSuccess: () => { toast.success('Budget supprimé'); qc.invalidateQueries({ queryKey: ['budgets'] }); },
        onError: () => toast.error('Erreur lors de la suppression'),
    });
};

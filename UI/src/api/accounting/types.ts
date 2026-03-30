export interface AccountCategory {
    id: string;
    code: string;
    name: string;
    description: string | null;
}

export interface Account {
    id: string;
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    categoryId: string;
    parentId: string | null;
    isSystem: boolean;
    isActive: boolean;
    description: string | null;
    departmentId: string | null;
    department?: { id: string; name: string } | null;
    category?: AccountCategory;
    children?: Account[];
}

export interface AccountTreeCategory extends AccountCategory {
    accounts: (Account & { children: Account[] })[];
}

export interface Journal {
    id: string;
    code: string;
    name: string;
    type: 'PURCHASES' | 'SALES' | 'BANK' | 'CASH' | 'MISCELLANEOUS';
    isActive: boolean;
}

export interface JournalEntryLine {
    id: string;
    journalEntryId: string;
    accountId: string;
    debit: number;
    credit: number;
    label: string | null;
    account?: Account;
}

export interface JournalEntry {
    id: string;
    entryNumber: string;
    journalId: string;
    fiscalYearId: string;
    date: string;
    description: string;
    reference: string | null;
    sourceType: 'MANUAL' | 'INVOICE' | 'EXPENSE' | 'SALARY' | 'TAX' | 'CREDIT_NOTE';
    sourceId: string | null;
    status: 'DRAFT' | 'VALIDATED';
    validatedAt: string | null;
    createdByUserId: string;
    totalDebit: number;
    totalCredit: number;
    journal?: Journal;
    fiscalYear?: FiscalYear;
    lines?: JournalEntryLine[];
    createdBy?: { id: string; email: string };
}

export interface FiscalYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'OPEN' | 'CLOSED';
    closedAt: string | null;
    closedBy?: { id: string; email: string };
}

export interface CreditNote {
    id: string;
    creditNoteNumber: string;
    invoiceId: string;
    reason: string;
    amount: number;
    taxAmount: number;
    total: number;
    status: 'DRAFT' | 'VALIDATED';
    createdByUserId: string;
    validatedAt: string | null;
    invoice?: any;
}

export interface Budget {
    id: string;
    fiscalYearId: string;
    accountId: string | null;
    departmentId: string | null;
    monthlyAmounts: number[];
    annualTotal: number;
    account?: Account;
    department?: any;
    fiscalYear?: FiscalYear;
}

export interface BudgetVariance extends Budget {
    actual: number;
    variance: number;
    variancePercent: number;
    status: 'OK' | 'WARNING' | 'OVER';
}

export interface DashboardKpis {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashBalance: number;
    receivables: number;
    payables: number;
    tvaDue: number;
}

export interface TrialBalanceAccount {
    account: Account;
    totalDebit: number;
    totalCredit: number;
    debitBalance: number;
    creditBalance: number;
}

export interface TrialBalance {
    accounts: TrialBalanceAccount[];
    totals: { totalDebit: number; totalCredit: number; isBalanced: boolean };
}

export interface IncomeStatement {
    revenues: any[];
    expenses: any[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
}

export interface BalanceSheet {
    assets: any[];
    liabilities: any[];
    totalAssets: number;
    totalLiabilities: number;
    isBalanced: boolean;
}

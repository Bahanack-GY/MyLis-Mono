export interface JustificationFile {
    filePath: string;
    originalName: string;
}

export interface Expense {
    id: string;
    title: string;
    amount: number;
    chargeFamily: string;
    chargeNature: string;
    source: 'MANUAL' | 'PAYROLL';
    type: 'ONE_TIME' | 'RECURRENT';
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
    date: string;
    demandId: string | null;
    projectId: string | null;
    departmentId: string | null;
    justificationFiles: JustificationFile[];
    project?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedExpenses {
    data: Expense[];
    total: number;
    page: number;
    totalPages: number;
}

export interface CreateExpenseDto {
    title: string;
    amount: number;
    chargeFamily: string;
    chargeNature: string;
    type: 'ONE_TIME' | 'RECURRENT';
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
    date: string;
    projectId?: string | null;
    departmentId?: string | null;
    justificationFiles?: JustificationFile[];
}

export interface ExpenseStats {
    totalYear: number;
    totalCount: number;
    recurrentCount: number;
    totalSalaries: number;
    totalProjects: number;
    byCategory: { name: string; value: number }[];
    byFamily: { code: string; value: number }[];
    byMonth: Record<string, any>[];
    series: string[];
}

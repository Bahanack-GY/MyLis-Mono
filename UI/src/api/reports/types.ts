export type ReportType = 'PERSONAL' | 'DEPARTMENT' | 'ACCOUNTING';
export type ReportPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'QUARTER' | 'SEMESTER' | 'ANNUAL';
export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface ReportTaskEntry {
    id: string;
    title: string;
    state: string;
    difficulty: string;
    dueDate?: string;
    startDate?: string;
    completedAt?: string;
    urgent?: boolean;
    important?: boolean;
    nature?: string;
    natureColor?: string;
    project?: string;
}

export interface ReportSummary {
    total: number;
    completed: number;
    reviewed: number;
    inProgress: number;
    blocked: number;
    created: number;
    assigned: number;
    completionRate: number;
}

export interface EmployeeReportEntry {
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        position?: string;
    };
    summary: ReportSummary;
    previousPeriodSummary?: ReportSummary;
    tasks: ReportTaskEntry[];
}

export interface SectionSummary {
    total: number;
    pending?: number;
    validated?: number;
    rejected?: number;
    open?: number;
    inProgress?: number;
    closed?: number;
    totalAmount?: number;
    paid?: number;
    sent?: number;
}

export interface ProjectSummary {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    budget?: number;
    revenue?: number;
    endDate?: string;
}

export interface LeadsSummary {
    newThisPeriod: number;
    won: number;
    lost: number;
    totalActive: number;
    potentialRevenue: number;
    wonRevenuePeriod: number;
}

export interface GoalEntry {
    year: number;
    month: number;
    targetAmount: number;
    employee?: string;
}

export interface ReportData {
    employee?: {
        id: string;
        firstName: string;
        lastName: string;
        department: string;
        position: string;
    };
    department?: {
        id: string;
        name: string;
    };
    period: {
        type: string;
        startDate: string;
        endDate: string;
    };
    summary: ReportSummary;
    previousPeriodSummary?: ReportSummary;
    previousPeriod?: { startDate: string; endDate: string };
    tasks?: ReportTaskEntry[];
    employees?: EmployeeReportEntry[];
    projects?: ProjectSummary[];
    aiContent?: string;
    language?: string;
    demandsSummary?: SectionSummary;
    ticketsSummary?: SectionSummary;
    businessExpensesSummary?: SectionSummary;
    leadsSummary?: LeadsSummary;
    goalsSummary?: GoalEntry[];
    invoicesSummary?: SectionSummary;
}

export interface AccountingReportData {
    fiscalYear: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        status: string;
    };
    period: {
        type: string;
        startDate: string;
        endDate: string;
    };
    kpis: {
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
        cashBalance: number;
        receivables: number;
        payables: number;
        tvaDue: number;
    };
    incomeStatement: {
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
        revenues?: any[];
        expenses?: any[];
    };
    balanceSheet: {
        totalAssets: number;
        totalLiabilities: number;
        equity: number;
        isBalanced: boolean;
        assets?: any[];
        liabilities?: any[];
    };
    trialBalance: {
        summary: any;
    };
    monthlySummary: {
        months: Array<{
            month: number;
            revenue: number;
            expenses: number;
        }>;
    };
    budgetVariance?: {
        totalBudgeted: number;
        totalActual: number;
        variance: number;
        complianceRate: number;
        overBudget: number;
        underBudget: number;
    };
    taxStatus?: {
        total: number;
        draft: number;
        validated: number;
        filed: number;
        totalAmount: number;
    };
    aiContent?: string;
    language?: string;
}

export interface Report {
    id: string;
    title: string;
    type: ReportType;
    status: ReportStatus;
    generatedByUserId: string;
    targetEmployeeId?: string;
    targetDepartmentId?: string;
    period: ReportPeriod;
    startDate: string;
    endDate: string;
    reportData?: ReportData | AccountingReportData;
    createdAt: string;
    updatedAt: string;
    generatedBy?: { id: string; email: string };
    targetEmployee?: {
        id: string;
        firstName: string;
        lastName: string;
        department?: { id: string; name: string };
    };
    targetDepartment?: { id: string; name: string };
}

export interface GenerateReportDto {
    type: ReportType;
    period: ReportPeriod;
    startDate: string;
    endDate: string;
    targetEmployeeId?: string;
    targetDepartmentId?: string;
    title?: string;
    language?: string;
    fiscalYearId?: string;
    fiscalYearName?: string;
    includeBudgetAnalysis?: boolean;
    includeTaxStatus?: boolean;
}

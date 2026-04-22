// All keys are namespaced under "mylis:" to avoid collisions on a shared Redis instance.
const NS = 'mylis:';

export const CACHE_KEYS = {
    // Tier 1 — Reference data
    DEPARTMENTS: `${NS}departments`,
    DEPARTMENT: (id: string) => `${NS}departments:${id}`,
    POSITIONS: `${NS}positions`,
    TASK_NATURES: `${NS}task-natures`,
    CHARGE_NATURES: (family?: string) => family ? `${NS}charge-natures:${family}` : `${NS}charge-natures`,
    TAX_CONFIG: `${NS}tax-config`,
    JOURNALS: `${NS}journals`,
    ACCOUNTS_LIST: `${NS}accounts:list`,
    ACCOUNTS_TREE: `${NS}accounts:tree`,
    FISCAL_YEARS: `${NS}fiscal-years`,
    FISCAL_YEARS_OPEN: `${NS}fiscal-years:open`,

    // Tier 2 — Aggregated reports
    BALANCE_SHEET: (fyId: string) => `${NS}accounting:balance-sheet:${fyId}`,
    INCOME_STATEMENT: (fyId: string, deptId?: string) => `${NS}accounting:income-statement:${fyId}:${deptId || 'all'}`,
    TRIAL_BALANCE: (fyId: string, deptId?: string) => `${NS}accounting:trial-balance:${fyId}:${deptId || 'all'}`,
    GRAND_LIVRE: (fyId: string, accountId?: string, deptId?: string) =>
        `${NS}accounting:grand-livre:${fyId}:${accountId || 'all'}:${deptId || 'all'}`,
    DASHBOARD_KPIS: (fyId: string, deptId?: string) => `${NS}accounting:dashboard-kpis:${fyId}:${deptId || 'all'}`,
    MONTHLY_SUMMARY: (fyId: string) => `${NS}accounting:monthly-summary:${fyId}`,
    CASH_FLOW: (fyId: string) => `${NS}accounting:cash-flow:${fyId}`,

    // Tier 3 — Tasks (short-lived, invalidated on any write)
    TASKS_BY_EMPLOYEE: (employeeId: string) => `${NS}tasks:employee:${employeeId}`,
    TASKS_BY_PROJECT: (projectId: string) => `${NS}tasks:project:${projectId}`,
    TASKS_BY_LEAD: (leadId: string) => `${NS}tasks:lead:${leadId}`,
    TASKS_WEEK: (employeeId: string, weekStart: string) => `${NS}tasks:week:${employeeId}:${weekStart}`,
    TASKS_WEEK_ALL: (deptId: string | undefined, weekStart: string) => `${NS}tasks:week:all:${deptId || 'none'}:${weekStart}`,
} as const;

export const CACHE_TTL = {
    REFERENCE: 3600,       // 1 hour  — departments, positions, task-natures, charge-natures, journals
    REFERENCE_LONG: 3600,  // 1 hour  — accounts tree, tax-config (was 24h; changed: rate/account changes must reflect within an hour)
    FISCAL_YEAR: 1800,     // 30 min  — fiscal years (open year status matters)
    REPORTS: 900,          // 15 min  — balance sheet, income statement, grand livre, cash flow
    REPORTS_FAST: 600,     // 10 min  — dashboard KPIs (more volatile)
    TASKS_LIST: 120,       //  2 min  — task lists by employee/project/lead
    TASKS_WEEK: 60,        //  1 min  — weekly task views (most volatile)
} as const;

// Redis glob patterns for bulk invalidation (scoped to this app's namespace)
export const CACHE_PATTERNS = {
    DEPARTMENTS: `${NS}departments*`,
    ACCOUNTS: `${NS}accounts:*`,
    FISCAL_YEARS: `${NS}fiscal-years*`,
    ACCOUNTING_REPORTS: `${NS}accounting:*`,
    TASKS: `${NS}tasks:*`,
} as const;

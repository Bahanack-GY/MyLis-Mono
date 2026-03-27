export interface TaxConfig {
    id: string;
    key: string;
    value: number;
    label: string;
    description: string | null;
    effectiveFrom: string;
    effectiveTo: string | null;
}

export interface TaxDeclaration {
    id: string;
    type: 'TVA_MONTHLY' | 'IS_ANNUAL' | 'IS_QUARTERLY_ADVANCE' | 'IRPP_ANNUAL' | 'CNPS_MONTHLY' | 'DSF';
    period: string;
    fiscalYearId: string;
    status: 'DRAFT' | 'VALIDATED' | 'FILED';
    data: any;
    totalAmount: number;
    dueDate: string;
    filedAt: string | null;
    fiscalYear?: { id: string; name: string };
}

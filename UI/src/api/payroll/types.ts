export interface PayrollRun {
    id: string;
    month: number;
    year: number;
    status: 'DRAFT' | 'CALCULATED' | 'VALIDATED' | 'PAID';
    totalGross: number;
    totalNet: number;
    totalEmployerCharges: number;
    calculatedAt: string | null;
    validatedAt: string | null;
    paidAt: string | null;
    payslips?: Payslip[];
}

export interface Payslip {
    id: string;
    payrollRunId: string;
    employeeId: string;
    grossSalary: number;
    netSalary: number;
    cnpsEmployee: number;
    cnpsEmployer: number;
    irpp: number;
    cfc: number;
    communalTax: number;
    totalDeductions: number;
    totalEmployerCharges: number;
    details: PayrollLineItem[];
    employee?: { id: string; firstName: string; lastName: string; department?: { id: string; name: string } };
    payrollRun?: PayrollRun;
}

export interface PayrollLineItem {
    label: string;
    base: number;
    rate: number;
    employeeAmount: number;
    employerAmount: number;
}

export interface PayrollPreview {
    grossSalary: number;
    cnpsEmployee: number;
    cnpsEmployer: number;
    cfc: number;
    taxableIncome: number;
    irpp: number;
    communalTax: number;
    totalDeductions: number;
    totalEmployerCharges: number;
    netSalary: number;
    details: PayrollLineItem[];
}

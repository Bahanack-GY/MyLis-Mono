export interface SalaryEmployee {
    id: string;
    firstName: string;
    lastName: string;
    departmentId: string | null;
    departmentName: string;
    role: string;
    salary: number;
}

export interface PayBulkResult {
    created: number;
    total: number;
    month: number;
    year: number;
}

export interface PayOneResult {
    employeeId: string;
    name: string;
    amount: number;
    month: number;
    year: number;
}

export interface AdvanceResult {
    employeeId: string;
    name: string;
    amount: number;
    date: string;
}

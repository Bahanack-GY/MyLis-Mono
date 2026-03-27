export type BusinessExpenseStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface BusinessExpenseType {
    id: string;
    name: string;
    color?: string;
}

export interface BusinessExpense {
    id: string;
    amount: number;
    date: string;
    description: string | null;
    receiptPath: string | null;
    status: BusinessExpenseStatus;
    rejectionReason: string | null;
    validatedAt: string | null;
    validatedById: string | null;
    typeId: string;
    employeeId: string;
    expenseId: string | null;
    createdAt: string;
    updatedAt: string;
    employee?: { id: string; firstName: string; lastName: string; avatarUrl: string; userId: string };
    expenseType?: { id: string; name: string; color?: string };
}

export interface CreateBusinessExpenseDto {
    amount: number;
    date: string;
    description?: string;
    receiptPath?: string;
    typeId: string;
}

export interface BusinessExpenseStats {
    total: number;
    totalPending: number;
    totalValidated: number;
    totalRejected: number;
    totalAmount: number;
}

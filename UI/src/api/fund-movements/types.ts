export interface FundMovementCeo {
    id: string;
    email: string;
    role: string;
    employee?: { firstName: string; lastName: string } | null;
}

export interface JustificationFile {
    filePath: string;
    originalName: string;
}

export interface FundMovement {
    id: string;
    type: 'APPORT' | 'RETRAIT';
    amount: number;
    description: string;
    date: string;
    ceoUserId: string;
    ceoUser?: FundMovementCeo | null;
    createdByUser?: FundMovementCeo | null;
    journalEntryRef?: string | null;
    justificationFiles: JustificationFile[];
    createdAt: string;
}

export interface FundMovementStats {
    totalApport: number;
    totalRetrait: number;
    solde: number;
    count: number;
}

export interface CreateFundMovementDto {
    type: 'APPORT' | 'RETRAIT';
    amount: number;
    description: string;
    date: string;
    ceoUserId?: string;
    justificationFiles?: JustificationFile[];
}

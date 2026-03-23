export type DemandStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
export type DemandImportance = 'BARELY' | 'IMPORTANT' | 'VERY_IMPORTANT' | 'URGENT';

export interface DemandItem {
    id: string;
    demandId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string | null;
}

export interface Demand {
    id: string;
    totalPrice: number;
    proformaUrl: string | null;
    importance: DemandImportance;
    status: DemandStatus;
    rejectionReason: string | null;
    validatedAt: string | null;
    employeeId: string;
    departmentId: string;
    createdAt: string;
    updatedAt: string;
    items: DemandItem[];
    department?: { id: string; name: string };
}

export interface CreateDemandDto {
    items: { name: string; quantity: number; unitPrice: number; imageUrl?: string }[];
    proformaUrl?: string;
    importance?: DemandImportance;
}

export type SanctionType = 'AVERTISSEMENT' | 'BLAME' | 'MISE_A_PIED' | 'LICENCIEMENT';
export type SanctionSeverity = 'LEGER' | 'MOYEN' | 'GRAVE';

export interface Sanction {
    id: string;
    type: SanctionType;
    title: string;
    reason: string;
    severity: SanctionSeverity;
    date: string;
    employeeId: string;
    issuedByUserId: string;
    employee?: { id: string; firstName: string; lastName: string };
    issuedBy?: { id: string; email: string };
}

export interface CreateSanctionDto {
    type: SanctionType;
    title?: string;
    reason?: string;
    severity?: SanctionSeverity;
    date?: string;
    employeeId: string;
}

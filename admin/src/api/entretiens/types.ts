export type EntretienType = 'ANNUEL' | 'PROFESSIONNEL' | 'EVALUATION' | 'DISCIPLINAIRE';
export type EntretienStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Entretien {
    id: string;
    type: EntretienType;
    title: string;
    date: string;
    status: EntretienStatus;
    notes: string;
    employeeId: string;
    conductedByUserId: string;
    employee?: { id: string; firstName: string; lastName: string };
    conductedBy?: { id: string; email: string };
}

export interface CreateEntretienDto {
    type: EntretienType;
    title?: string;
    date?: string;
    status?: EntretienStatus;
    notes?: string;
    employeeId: string;
    conductedByUserId?: string;
}

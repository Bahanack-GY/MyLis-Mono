export interface Formation {
    id: string;
    title: string;
    organization: string;
    startDate: string;
    endDate: string;
    certificateDetails: string;
    employeeId: string;
    employee?: { id: string; firstName: string; lastName: string };
}

export interface CreateFormationDto {
    title: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    certificateDetails?: string;
    employeeId: string;
}

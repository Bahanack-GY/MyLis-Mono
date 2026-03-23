export interface Position {
    id: string;
    title: string;
    description: string;
}

export interface CreatePositionDto {
    title: string;
    description?: string;
    missions?: string[];
    departmentId?: string;
}

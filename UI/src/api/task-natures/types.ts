export interface TaskNature {
    id: string;
    name: string;
    color?: string;
}

export interface CreateTaskNatureDto {
    name: string;
    color?: string;
}

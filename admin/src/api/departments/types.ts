export interface Department {
    id: string;
    name: string;
    description: string;
    headId?: string | null;
    head?: { id: string; firstName: string; lastName: string; avatarUrl: string } | null;
    employees?: { id: string; firstName: string; lastName: string; avatarUrl: string; position?: { title: string } }[];
    clients?: { id: string; name: string }[];
    projects?: { id: string; name: string }[];
    goals?: DepartmentGoal[];
}

export interface CreateDepartmentDto {
    name: string;
    description?: string;
    headId?: string | null;
}

export interface DepartmentGoal {
    id: string;
    departmentId: string;
    year: number;
    targetRevenue: number;
    currentRevenue: number;
}

export interface CreateDepartmentGoalDto {
    departmentId: string;
    year: number;
    targetRevenue: number;
}

export interface UpdateDepartmentDto {
    name?: string;
    description?: string;
    headId?: string | null;
}

export type UpdateDepartmentGoalDto = Partial<Omit<CreateDepartmentGoalDto, 'departmentId'>>;

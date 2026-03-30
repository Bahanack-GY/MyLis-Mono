export interface Department {
    id: string;
    name: string;
    description?: string;
    headId?: string | null;
    defaultTargetRevenue?: number | null;
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
    defaultTargetRevenue?: number | null;
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
    defaultTargetRevenue?: number | null;
}

export type UpdateDepartmentGoalDto = Partial<Omit<CreateDepartmentGoalDto, 'departmentId'>>;

export interface DepartmentMonthlyTarget {
    id: string;
    departmentId: string;
    year: number;
    month: number;
    targetRevenue: number;
}

export interface MonthlyStatRow {
    month: number;
    targetRevenue: number;
    actualRevenue: number;
    hasExplicitTarget: boolean;
    usingDefault: boolean;
}

export interface UpsertMonthlyTargetDto {
    departmentId: string;
    year: number;
    month: number;
    targetRevenue: number;
}

export interface DepartmentService {
    id: string;
    departmentId: string;
    name: string;
    description?: string;
    price?: number;
    duration?: string;
    isActive: boolean;
}

export interface CreateDepartmentServiceDto {
    departmentId: string;
    name: string;
    description?: string;
    price?: number;
    duration?: string;
    isActive?: boolean;
}

export type UpdateDepartmentServiceDto = Partial<Omit<CreateDepartmentServiceDto, 'departmentId'>>;

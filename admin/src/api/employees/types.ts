export interface Employee {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    departmentId: string;
    positionId: string;
    teamId: string;
    phoneNumber: string;
    avatarUrl: string;
    hireDate: string;
    birthDate?: string;
    address?: string;
    salary?: number;
    skills?: string[];
    educationDocs?: { name: string; type: string; filePath?: string }[];
    recruitmentDocs?: { name: string; type: string; filePath?: string }[];
    dismissed?: boolean;
    dismissedAt?: string;
    user?: { id: string; email: string; role: string };
    department?: { id: string; name: string };
    position?: { id: string; title: string };
    team?: { id: string; name: string };
}

export interface CreateEmployeeDto {
    userId?: string;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    departmentId?: string;
    positionId?: string;
    teamId?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    hireDate?: string;
    birthDate?: string;
    address?: string;
    salary?: number;
    skills?: string[];
    educationDocs?: { name: string; type: string; filePath?: string }[];
    recruitmentDocs?: { name: string; type: string; filePath?: string }[];
}

export type UpdateEmployeeDto = Partial<CreateEmployeeDto>;

export interface LeaderboardEmployee {
    id: string;
    rank: number;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    department: string;
    positionTitle: string;
    points: number;
}

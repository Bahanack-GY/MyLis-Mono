export type Role = 'MANAGER' | 'EMPLOYEE' | 'HEAD_OF_DEPARTMENT' | 'ACCOUNTANT' | 'COMMERCIAL' | 'STAGIAIRE';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
    role?: Role;
}

export interface AuthResponse {
    access_token: string;
    user: { id: string; email: string; role: Role; departmentId: string | null };
}

export interface EducationDoc {
    name: string;
    type: string;
    filePath?: string;
}

export interface UserProfile {
    userId: string;
    email: string;
    role: Role;
    firstLogin?: boolean;
    departmentId: string | null;
    employeeId: string | null;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    avatarUrl: string;
    address: string;
    birthDate: string | null;
    hireDate: string | null;
    skills: string[];
    departmentName: string;
    positionTitle: string;
    projectsCount?: number;
    educationDocs?: EducationDoc[];
    points?: number;
    completedTasksCount?: number;
}

export interface EmployeeBadge {
    id: string;
    badgeNumber: number;
    title: string;
    milestone: number;
    earnedAt: string;
}

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    birthDate?: string;
    avatarUrl?: string;
    skills?: string[];
    educationDocs?: EducationDoc[];
}

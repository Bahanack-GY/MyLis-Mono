export type Role = 'MANAGER' | 'EMPLOYEE' | 'HEAD_OF_DEPARTMENT' | 'ACCOUNTANT';

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

export interface UserProfile {
    userId: string;
    email: string;
    role: Role;
    departmentId: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    phoneNumber: string;
    address: string;
    birthDate: string | null;
    hireDate: string | null;
    departmentName: string;
    positionTitle: string;
    employeeId: string | null;
    skills: string[];
}

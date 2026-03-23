import api from '../config';
import type { LoginDto, RegisterDto, AuthResponse, UserProfile, UpdateProfileDto, EmployeeBadge } from './types';

export const authApi = {
    login: (dto: LoginDto) =>
        api.post<AuthResponse>('/auth/login', dto).then(r => r.data),

    register: (dto: RegisterDto) =>
        api.post('/auth/register', dto).then(r => r.data),

    getProfile: () =>
        api.get<UserProfile>('/auth/profile').then(r => r.data),

    updateProfile: (dto: UpdateProfileDto) =>
        api.patch<UserProfile>('/auth/profile', dto).then(r => r.data),

    getMyBadges: () =>
        api.get<EmployeeBadge[]>('/auth/my-badges').then(r => r.data),

    markFirstLoginDone: () =>
        api.patch('/auth/first-login-done').then(r => r.data),

    changePassword: (currentPassword: string, newPassword: string) =>
        api.patch('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),
};

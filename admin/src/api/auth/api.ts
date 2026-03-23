import api from '../config';
import type { LoginDto, RegisterDto, AuthResponse, UserProfile } from './types';

export const authApi = {
    login: (dto: LoginDto) =>
        api.post<AuthResponse>('/auth/login', dto).then(r => r.data),

    register: (dto: RegisterDto) =>
        api.post('/auth/register', dto).then(r => r.data),

    getProfile: () =>
        api.get<UserProfile>('/auth/profile').then(r => r.data),
};

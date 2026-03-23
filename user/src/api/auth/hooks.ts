import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from './api';
import type { LoginDto, RegisterDto, UpdateProfileDto } from './types';
import i18n from '../../i18n/config';

export const authKeys = {
    profile: ['auth', 'profile'] as const,
    badges: ['auth', 'my-badges'] as const,
};

export const useProfile = (token?: string | null) =>
    useQuery({
        queryKey: authKeys.profile,
        queryFn: authApi.getProfile,
        enabled: !!token,
    });

import { useAuth } from '../../contexts/AuthContext';

export const useLogin = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { setToken } = useAuth();

    return useMutation({
        mutationFn: (dto: LoginDto) => authApi.login(dto),
        onSuccess: (data) => {
            const allowedRoles = ['EMPLOYEE', 'HEAD_OF_DEPARTMENT', 'MANAGER', 'ACCOUNTANT'];
            if (!allowedRoles.includes(data.user.role)) {
                throw new Error('ACCESS_DENIED');
            }
            setToken(data.access_token);
            qc.invalidateQueries({ queryKey: authKeys.profile });
            navigate('/dashboard');
        },
        onError: () => toast.error(i18n.t('toast.loginFailed')),
    });
};

export const useRegister = () =>
    useMutation({
        mutationFn: (dto: RegisterDto) => authApi.register(dto),
        onSuccess: () => toast.success(i18n.t('toast.accountCreated')),
        onError: () => toast.error(i18n.t('toast.error')),
    });

export const useUpdateProfile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: UpdateProfileDto) => authApi.updateProfile(dto),
        onSuccess: () => {
            toast.success(i18n.t('toast.profileUpdated'));
            qc.invalidateQueries({ queryKey: authKeys.profile });
        },
        onError: () => toast.error(i18n.t('toast.error')),
    });
};

export const useMyBadges = () =>
    useQuery({
        queryKey: authKeys.badges,
        queryFn: authApi.getMyBadges,
    });

export const useChangePassword = () =>
    useMutation({
        mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
            authApi.changePassword(currentPassword, newPassword),
        onSuccess: () => toast.success(i18n.t('toast.passwordChanged')),
        onError: () => toast.error(i18n.t('toast.passwordChangeFailed')),
    });

export const useLogout = () => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { setToken } = useAuth();

    return () => {
        setToken(null);
        qc.clear();
        navigate('/login');
    };
};

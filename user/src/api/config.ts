import axios from 'axios';
import { toast } from 'sonner';
import i18n from '../i18n/config';

const API_URL = "http://localhost:3000"

const api = axios.create({
    baseURL: API_URL,
    timeout: 20000,
    headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token into every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global response error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        if (status === 403) {
            toast.error(i18n.t('toast.accessDenied'));
        } else if (status === 429) {
            toast.error(i18n.t('httpErrors.rateLimit'));
        } else if (status >= 500) {
            toast.error(i18n.t('httpErrors.serverError'));
        } else if (!error.response) {
            toast.error(i18n.t('httpErrors.network'));
        }

        return Promise.reject(error);
    },
);

export default api;

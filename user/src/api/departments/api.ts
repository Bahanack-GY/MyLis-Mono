import api from '../config';
import type { Department } from './types';

export const departmentsApi = {
    getAll: () =>
        api.get<Department[]>('/organization/departments').then(r => r.data),
};

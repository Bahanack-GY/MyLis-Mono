import api from '../config';
import type { Sanction } from './types';

export const sanctionsApi = {
    getMy: () =>
        api.get<Sanction[]>('/hr/sanctions/my').then(r => r.data),
};

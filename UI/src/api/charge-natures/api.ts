import api from '../config';
import type { ChargeFamily, ChargeNature, CreateChargeNatureDto } from './types';

export const chargeNaturesApi = {
    getFamilies: () =>
        api.get<ChargeFamily[]>('/charge-natures/families').then(r => r.data),

    getAll: (chargeFamily?: string) =>
        api.get<ChargeNature[]>('/charge-natures', { params: chargeFamily ? { chargeFamily } : {} }).then(r => r.data),

    create: (dto: CreateChargeNatureDto) =>
        api.post<ChargeNature>('/charge-natures', dto).then(r => r.data),

    update: (id: string, dto: Partial<CreateChargeNatureDto>) =>
        api.patch<ChargeNature>(`/charge-natures/${id}`, dto).then(r => r.data),

    delete: (id: string) =>
        api.delete<{ success: boolean }>(`/charge-natures/${id}`).then(r => r.data),
};

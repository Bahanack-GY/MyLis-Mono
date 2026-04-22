export interface ChargeFamily {
    code: string;
    label: string;
}

export interface ChargeNature {
    id: string;
    chargeFamily: string;
    natureName: string;
    syscohadaAccount: string;
    isSystem: boolean;
    sortOrder: number;
}

export interface CreateChargeNatureDto {
    chargeFamily: string;
    natureName: string;
    syscohadaAccount: string;
}

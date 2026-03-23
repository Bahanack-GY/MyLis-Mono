export interface Client {
    id: string;
    name: string;
    projectDescription: string;
    price: string;
    srs: string;
    contract: string;
    type: 'one_time' | 'subscription';
    departmentId: string;
    department?: { id: string; name: string };
}

export interface CreateClientDto {
    name: string;
    projectDescription?: string;
    price?: string;
    srs?: string;
    contract?: string;
    type?: 'one_time' | 'subscription';
    departmentId?: string;
}

export type UpdateClientDto = Partial<CreateClientDto>;

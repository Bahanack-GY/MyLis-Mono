export interface Team {
    id: string;
    name: string;
    leadId: string;
    lead?: { id: string; firstName: string; lastName: string; avatarUrl: string };
    members?: { id: string; firstName: string; lastName: string; avatarUrl: string }[];
}

export interface CreateTeamDto {
    name: string;
    leadId?: string;
}

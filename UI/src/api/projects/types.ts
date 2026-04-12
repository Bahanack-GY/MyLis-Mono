export interface ProjectMilestone {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    dueDate?: string;
    completedAt: string | null;
    completedById: string | null;
    completedByName: string | null;
    order: number;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    clientId?: string;
    departmentId: string;
    budget?: number;
    revenue?: number;
    startDate?: string;
    endDate?: string;
    client?: { id: string; name: string };
    department?: { id: string; name: string };
    services?: { id: string; name: string; price?: number; duration?: string }[];
    members?: { id: string; firstName: string; lastName: string; avatarUrl: string }[];
    milestones?: ProjectMilestone[];
    tasks?: {
        id: string;
        title: string;
        state: string;
        difficulty?: string;
        dueDate?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
    }[];
}

export interface CreateProjectDto {
    name: string;
    description?: string;
    clientId?: string;
    departmentId?: string;
    serviceIds?: string[];
    budget?: number;
    revenue?: number;
    startDate?: string;
    endDate?: string;
}

export type UpdateProjectDto = Partial<CreateProjectDto>;

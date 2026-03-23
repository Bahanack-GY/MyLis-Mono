export interface Project {
    id: string;
    name: string;
    description: string;
    departmentId: string;
    startDate?: string;
    endDate?: string;
    department?: { id: string; name: string };
    members?: { id: string; firstName: string; lastName: string; avatarUrl: string }[];
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

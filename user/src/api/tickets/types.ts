export type TicketStatus = 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdById: string;
    targetDepartmentId: string;
    assignedToId: string;
    dueDate: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy?: { id: string; email: string };
    targetDepartment?: { id: string; name: string };
    assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl: string };
}

export interface CreateTicketDto {
    title: string;
    description?: string;
    priority?: TicketPriority;
    targetDepartmentId?: string;
    dueDate?: string;
}

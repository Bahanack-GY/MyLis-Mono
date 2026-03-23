export type TaskState = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'REVIEWED';
export type TaskDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Task {
    id: string;
    title: string;
    description: string;
    state: TaskState;
    difficulty: TaskDifficulty;
    dueDate: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    selfAssigned?: boolean;
    assignedToId: string;
    assignedToTeamId: string;
    projectId: string;
    assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl: string };
    assignedToTeam?: { id: string; name: string };
    project?: { id: string; name: string };
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskDto {
    title: string;
    description?: string;
    state?: TaskState;
    difficulty?: TaskDifficulty;
    dueDate?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    assignedToId?: string;
    assignedToTeamId?: string;
    projectId?: string;
}

export type UpdateTaskDto = Partial<CreateTaskDto>;

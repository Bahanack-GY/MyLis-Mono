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
    blockReason?: string;
    selfAssigned?: boolean;
    startedAt?: string | null;
    completedAt?: string | null;
    assignedToId: string;
    assignedToTeamId: string;
    projectId: string;
    assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl: string };
    assignedToTeam?: { id: string; name: string };
    project?: { id: string; name: string };
}

export interface SelfAssignTaskDto {
    title: string;
    description?: string;
    difficulty?: TaskDifficulty;
    dueDate?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    projectId?: string;
}

export interface GamificationResult {
    pointsEarned: number;
    totalPoints: number;
    newBadge?: {
        badgeNumber: number;
        title: string;
        milestone: number;
    };
}

export interface TaskUpdateResponse {
    task: Task;
    gamification?: GamificationResult;
}

export type TaskState = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'REVIEWED';
export type TaskDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TaskAttachment {
    id: string;
    taskId: string;
    fileName: string;
    filePath: string;
    fileType: string;
    size: number;
    uploadedByUserId?: string;
    createdAt?: string;
}

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
    order: number;
    taskId: string;
    completedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

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
    urgent?: boolean;
    important?: boolean;
    transferredFromWeek?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    assignedToId: string;
    assignedToTeamId: string;
    projectId: string;
    assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl: string; departmentId?: string };
    assignedToTeam?: { id: string; name: string };
    project?: { id: string; name: string };
    natureId?: string;
    nature?: { id: string; name: string; color?: string };
    leadId?: string;
    lead?: { id: string; code: string; company: string };
    subtasks?: Subtask[];
    attachments?: TaskAttachment[];
    createdAt?: string;
    updatedAt?: string;
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
    natureId?: string;
    leadId?: string;
    urgent?: boolean;
    important?: boolean;
}

export type UpdateTaskDto = Partial<CreateTaskDto>;

export interface SelfAssignTaskDto {
    title: string;
    description?: string;
    difficulty?: TaskDifficulty;
    dueDate?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    projectId?: string;
    natureId?: string;
    leadId?: string;
    urgent?: boolean;
    important?: boolean;
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

export interface WeeklyComplianceResult {
    canCreate: boolean;
    pendingTasks: Task[];
}

export interface TimeDistributionItem {
    name: string;
    color: string;
    hours: number;
    percentage: number;
}

export interface DailyHoursItem {
    date: string;
    hours: number;
}

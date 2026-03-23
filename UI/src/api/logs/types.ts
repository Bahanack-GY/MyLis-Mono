export interface Log {
    id: string;
    action: string;
    userId: string;
    details: Record<string, unknown>;
    timestamp: string;
    user?: {
        id: string;
        email: string;
        role: string;
        employee?: {
            firstName: string;
            lastName: string;
            avatarUrl?: string;
        };
    };
}

export interface LogsPage {
    data: Log[];
    total: number;
    page: number;
    totalPages: number;
}

export interface LogsStats {
    total: number;
    todayCount: number;
    activeUsers: number;
    topAction: string | null;
    chartData: { day: string; count: number }[];
}

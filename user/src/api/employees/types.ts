export interface LeaderboardEntry {
    id: string;
    rank: number;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    department: string;
    positionTitle: string;
    points: number;
}

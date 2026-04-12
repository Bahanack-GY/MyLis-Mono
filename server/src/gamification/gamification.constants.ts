
export const POINTS_BY_DIFFICULTY: Record<string, number> = {
    EASY: 1,
    MEDIUM: 3,
    HARD: 5,
};

// Speed bonuses (days between completedAt and dueDate)
export const SPEED_BONUS_LIGHTNING = 1; // completed 5+ days early
export const SPEED_BONUS_EARLY = 1;     // completed 2–4 days early
export const SPEED_BONUS_ONTIME = 0;    // completed 0–1 days early (on time)
export const SPEED_PENALTY_LATE = 1;    // completed 3+ days late (deducted, min 1 net)

// Weekly streak bonuses — triggered at exact weekly task counts
export const STREAK_BONUS_3 = 1;   // 3rd task completed this week
export const STREAK_BONUS_5 = 1;   // 5th task completed this week
export const STREAK_BONUS_7 = 1;   // 7th task completed this week

// Max points a single task can award
export const MAX_TASK_POINTS = 5;

export interface BadgeDefinition {
    badgeNumber: number;
    milestone: number;
    title: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    { badgeNumber: 1,  milestone: 10,   title: 'First Steps' },
    { badgeNumber: 2,  milestone: 30,   title: 'Getting Started' },
    { badgeNumber: 3,  milestone: 60,   title: 'On a Roll' },
    { badgeNumber: 4,  milestone: 100,  title: 'Dedicated' },
    { badgeNumber: 5,  milestone: 150,  title: 'Committed' },
    { badgeNumber: 6,  milestone: 210,  title: 'Reliable' },
    { badgeNumber: 7,  milestone: 280,  title: 'Half Century' },
    { badgeNumber: 8,  milestone: 360,  title: 'Powerhouse' },
    { badgeNumber: 9,  milestone: 450,  title: 'Centurion' },
    { badgeNumber: 10, milestone: 550,  title: 'Unstoppable' },
    { badgeNumber: 11, milestone: 660,  title: 'Legend' },
    { badgeNumber: 12, milestone: 780,  title: 'Elite' },
    { badgeNumber: 13, milestone: 910,  title: 'Master' },
    { badgeNumber: 14, milestone: 1050, title: 'Grandmaster' },
    { badgeNumber: 15, milestone: 1200, title: 'Champion' },
    { badgeNumber: 16, milestone: 1360, title: 'Ultimate' },
];

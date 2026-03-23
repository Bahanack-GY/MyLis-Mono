
export const POINTS_BY_DIFFICULTY: Record<string, number> = {
    EASY: 5,
    MEDIUM: 10,
    HARD: 15,
};

// Speed bonuses (days between completedAt and dueDate)
export const SPEED_BONUS_LIGHTNING = 5; // completed 5+ days early
export const SPEED_BONUS_EARLY = 3;     // completed 2–4 days early
export const SPEED_BONUS_ONTIME = 1;    // completed 0–1 days early (on time)
export const SPEED_PENALTY_LATE = 3;    // completed 3+ days late (deducted, min 1 net)

// Weekly streak bonuses — triggered at exact weekly task counts
export const STREAK_BONUS_3 = 5;   // 3rd task completed this week
export const STREAK_BONUS_5 = 8;   // 5th task completed this week
export const STREAK_BONUS_7 = 12;  // 7th task completed this week

export interface BadgeDefinition {
    badgeNumber: number;
    milestone: number;
    title: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    { badgeNumber: 1,  milestone: 5,   title: 'First Steps' },
    { badgeNumber: 2,  milestone: 15,  title: 'Getting Started' },
    { badgeNumber: 3,  milestone: 30,  title: 'On a Roll' },
    { badgeNumber: 4,  milestone: 50,  title: 'Dedicated' },
    { badgeNumber: 5,  milestone: 75,  title: 'Committed' },
    { badgeNumber: 6,  milestone: 105, title: 'Reliable' },
    { badgeNumber: 7,  milestone: 140, title: 'Half Century' },
    { badgeNumber: 8,  milestone: 180, title: 'Powerhouse' },
    { badgeNumber: 9,  milestone: 225, title: 'Centurion' },
    { badgeNumber: 10, milestone: 275, title: 'Unstoppable' },
    { badgeNumber: 11, milestone: 330, title: 'Legend' },
    { badgeNumber: 12, milestone: 390, title: 'Elite' },
    { badgeNumber: 13, milestone: 455, title: 'Master' },
    { badgeNumber: 14, milestone: 525, title: 'Grandmaster' },
    { badgeNumber: 15, milestone: 600, title: 'Champion' },
    { badgeNumber: 16, milestone: 680, title: 'Ultimate' },
];

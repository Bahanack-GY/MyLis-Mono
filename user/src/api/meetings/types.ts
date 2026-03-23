export type MeetingType = 'standup' | 'review' | 'planning' | 'retrospective' | 'client' | 'onboarding';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MeetingParticipant {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
}

export interface Meeting {
    id: string;
    title: string;
    description: string;
    type: MeetingType;
    status: MeetingStatus;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    organizerId: string;
    organizer?: { id: string; email: string };
    participants?: MeetingParticipant[];
    report: {
        summary: string;
        decisions: string[];
        actionItems: { task: string; assignee: string }[];
    } | null;
    createdAt: string;
    updatedAt: string;
}

export type MeetingType = 'standup' | 'review' | 'planning' | 'retrospective' | 'client' | 'onboarding';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MeetingParticipant {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    MeetingParticipant?: { attended: boolean };
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
    secretaryId?: string | null;
    transcript?: string | null;
    organizer?: { id: string; email: string };
    secretary?: { id: string; firstName: string; lastName: string } | null;
    participants?: MeetingParticipant[];
    report: {
        summary: string;
        whatWasSaid?: string;
        decisions: string[];
        actionItems: { task: string; assignee: string; deadline?: string | null }[];
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMeetingDto {
    title: string;
    description?: string;
    type: MeetingType;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    participantIds?: string[];
}

export interface UpdateMeetingDto {
    title?: string;
    description?: string;
    type?: MeetingType;
    status?: MeetingStatus;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    participantIds?: string[];
    report?: Meeting['report'];
}

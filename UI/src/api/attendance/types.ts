export interface AttendanceDayPair {
    sw: string | null;
    ew: string | null;
}

export interface AttendanceDay {
    day: number;
    pairs: AttendanceDayPair[];
}

export interface AttendanceRecord {
    id: string;
    employeeName: string;
    department: string | null;
    externalEmployeeId: string | null;
    cardNumber: string | null;
    days: AttendanceDay[];
    presentDays: number;
    absentDays: number;
}

export interface AttendanceMonth {
    id: string;
    year: number;
    month: number;
    fileName: string;
    employeeCount: number;
    daysCount: number;
    createdAt: string;
    records: AttendanceRecord[];
}

export interface AttendanceMonthSummary {
    id: string;
    year: number;
    month: number;
    fileName: string;
    employeeCount: number;
    daysCount: number;
    createdAt: string;
    uploadedBy: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
    } | null;
}

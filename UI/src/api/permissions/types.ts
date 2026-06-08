export type PermissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PermissionRequest {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  reason: string;
  status: PermissionStatus;
  approvedById: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    departmentId?: string;
  };
  approvedBy?: {
    id: string;
    email: string;
    employee?: { firstName: string; lastName: string };
  };
}

export interface CreatePermissionDto {
  date: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  reason: string;
}

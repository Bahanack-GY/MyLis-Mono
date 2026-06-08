export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string | null;
  status: LeaveStatus;
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

export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface CreateLeaveDto {
  type: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays?: number;
  reason?: string;
}

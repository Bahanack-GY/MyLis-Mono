export interface PointsBracket {
  minPoints: number;
  maxPoints: number | null;
  factor: number;
}

export interface EmployeeAdjustment {
  employeeId: string;
  employeeName: string;
  avatarUrl: string | null;
  department: string | null;
  baseSalary: number;
  dailyRate: number;
  hasAttendanceData: boolean;
  absentDays: number;
  justifiedDays: number;
  unjustifiedAbsentDays: number;
  absenceDeduction: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  points: number;
  pointsFactor: number;
  pointsAdjustment: number;
  totalDeduction: number;
  totalPrime: number;
  netImpact: number;
}

export interface PreviewResult {
  month: number;
  year: number;
  workDaysPerMonth: number;
  hasAttendanceData: boolean;
  employees: EmployeeAdjustment[];
  totals: {
    totalDeductions: number;
    totalPrimes: number;
    netImpact: number;
  };
}

export interface ManualLine {
  label: string;
  amount: number;
}

export interface ManualEmployeeAdjustment {
  employeeId: string;
  primes: ManualLine[];
  retenus: ManualLine[];
}

export interface ApplyPayload {
  month: number;
  year: number;
  workDaysPerMonth?: number;
  brackets?: PointsBracket[];
  employeeIds?: string[];
  manualAdjustments?: ManualEmployeeAdjustment[];
}

export const DEFAULT_BRACKETS: PointsBracket[] = [
  { minPoints: 0, maxPoints: 50, factor: -0.02 },
  { minPoints: 51, maxPoints: 100, factor: 0 },
  { minPoints: 101, maxPoints: 200, factor: 0.01 },
  { minPoints: 201, maxPoints: 300, factor: 0.02 },
  { minPoints: 301, maxPoints: null, factor: 0.03 },
];

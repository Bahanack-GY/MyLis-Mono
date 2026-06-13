import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Employee } from '../models/employee.model';
import { AttendanceUpload } from '../models/attendance-upload.model';
import { AttendanceRecord } from '../models/attendance-record.model';
import { LeaveRequest } from '../models/leave-request.model';
import { SalaryComponent } from '../models/salary-component.model';
import { User } from '../models/user.model';

export interface PointsBracket {
  minPoints: number;
  maxPoints: number | null;
  factor: number;
}

export const DEFAULT_BRACKETS: PointsBracket[] = [
  { minPoints: 0, maxPoints: 50, factor: -0.02 },
  { minPoints: 51, maxPoints: 100, factor: 0 },
  { minPoints: 101, maxPoints: 200, factor: 0.01 },
  { minPoints: 201, maxPoints: 300, factor: 0.02 },
  { minPoints: 301, maxPoints: null, factor: 0.03 },
];

export interface ManualLine {
  label: string;
  amount: number;
}

export interface ManualEmployeeAdjustment {
  employeeId: string;
  primes: ManualLine[];
  retenus: ManualLine[];
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
  totals: { totalDeductions: number; totalPrimes: number; netImpact: number };
}

@Injectable()
export class RhSalaryService {
  constructor(
    @InjectModel(Employee) private employeeModel: typeof Employee,
    @InjectModel(AttendanceUpload) private uploadModel: typeof AttendanceUpload,
    @InjectModel(AttendanceRecord) private recordModel: typeof AttendanceRecord,
    @InjectModel(LeaveRequest) private leaveModel: typeof LeaveRequest,
    @InjectModel(SalaryComponent) private componentModel: typeof SalaryComponent,
  ) {}

  async preview(params: {
    month: number;
    year: number;
    workDaysPerMonth?: number;
    brackets?: PointsBracket[];
    employeeIds?: string[];
  }): Promise<PreviewResult> {
    const { month, year } = params;
    const workDays = params.workDaysPerMonth ?? 23;
    const brackets = params.brackets ?? DEFAULT_BRACKETS;

    const where: Record<string, any> = { dismissed: { [Op.or]: [false, null] } };
    if (params.employeeIds?.length) where.id = { [Op.in]: params.employeeIds };

    const employees = await this.employeeModel.findAll({
      where,
      include: [
        { model: User, attributes: ['email', 'role'] },
      ],
    });

    const upload = await this.uploadModel.findOne({
      where: { year, month },
      include: [{ model: AttendanceRecord }],
    });

    const firstDay = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

    const leaves = await this.leaveModel.findAll({
      where: {
        status: 'APPROVED',
        startDate: { [Op.lte]: lastDay },
        endDate: { [Op.gte]: firstDay },
      },
    });

    const leavesByEmp = new Map<string, LeaveRequest[]>();
    for (const l of leaves) {
      const arr = leavesByEmp.get(l.employeeId) ?? [];
      arr.push(l);
      leavesByEmp.set(l.employeeId, arr);
    }

    const adjustments: EmployeeAdjustment[] = [];

    for (const emp of employees) {
      const baseSalary =
        (emp as any).baseSalary ?? (emp as any).salary ?? 0;
      if (baseSalary <= 0) continue;

      const dailyRate = baseSalary / workDays;
      const empLeaves = leavesByEmp.get(emp.id) ?? [];

      let hasAttendanceData = false;
      let absentDays = 0;
      let justifiedDays = 0;

      if (upload) {
        const records = (upload as any).records as AttendanceRecord[] ?? [];
        const record = this.matchRecord(records, emp);
        if (record) {
          hasAttendanceData = true;
          absentDays = (record as any).absentDays ?? 0;
          const paidLeaves = empLeaves.filter(l => l.type !== 'UNPAID');
          const covered = paidLeaves.reduce(
            (s, l) => s + this.workdaysInMonth(l.startDate, l.endDate, year, month),
            0,
          );
          justifiedDays = Math.min(covered, absentDays);
        }
      }

      const unjustifiedAbsentDays = Math.max(0, absentDays - justifiedDays);
      const absenceDeduction = unjustifiedAbsentDays * dailyRate;

      const unpaidDays = empLeaves
        .filter(l => l.type === 'UNPAID')
        .reduce((s, l) => s + this.workdaysInMonth(l.startDate, l.endDate, year, month), 0);
      const unpaidDeduction = unpaidDays * dailyRate;

      const points = (emp as any).points ?? 0;
      const factor = this.getBracketFactor(points, brackets);
      const pointsAdj = baseSalary * factor;

      const totalDeduction =
        absenceDeduction +
        unpaidDeduction +
        (pointsAdj < 0 ? Math.abs(pointsAdj) : 0);
      const totalPrime = pointsAdj > 0 ? pointsAdj : 0;

      adjustments.push({
        employeeId: emp.id,
        employeeName: `${(emp as any).firstName} ${(emp as any).lastName}`,
        avatarUrl: (emp as any).avatarUrl ?? null,
        department: null,
        baseSalary,
        dailyRate: Math.round(dailyRate),
        hasAttendanceData,
        absentDays,
        justifiedDays,
        unjustifiedAbsentDays,
        absenceDeduction: Math.round(absenceDeduction),
        unpaidLeaveDays: unpaidDays,
        unpaidLeaveDeduction: Math.round(unpaidDeduction),
        points,
        pointsFactor: factor,
        pointsAdjustment: Math.round(pointsAdj),
        totalDeduction: Math.round(totalDeduction),
        totalPrime: Math.round(totalPrime),
        netImpact: Math.round(totalPrime - totalDeduction),
      });
    }

    const totals = adjustments.reduce(
      (acc, a) => ({
        totalDeductions: acc.totalDeductions + a.totalDeduction,
        totalPrimes: acc.totalPrimes + a.totalPrime,
        netImpact: acc.netImpact + a.netImpact,
      }),
      { totalDeductions: 0, totalPrimes: 0, netImpact: 0 },
    );

    return {
      month,
      year,
      workDaysPerMonth: workDays,
      hasAttendanceData: !!upload,
      employees: adjustments,
      totals,
    };
  }

  async apply(params: {
    month: number;
    year: number;
    workDaysPerMonth?: number;
    brackets?: PointsBracket[];
    employeeIds?: string[];
    manualAdjustments?: ManualEmployeeAdjustment[];
  }): Promise<{ applied: number }> {
    const preview = await this.preview(params);
    const tag = this.monthTag(params.month, params.year);
    let applied = 0;

    // Build lookup for manual adjustments
    const manualMap = new Map<string, ManualEmployeeAdjustment>();
    for (const m of params.manualAdjustments ?? []) {
      manualMap.set(m.employeeId, m);
    }

    // Collect all employee IDs to process (preview + any manual-only employees)
    const previewIds = new Set(preview.employees.map(a => a.employeeId));
    const allIds = [...previewIds];
    for (const m of params.manualAdjustments ?? []) {
      if (!previewIds.has(m.employeeId)) allIds.push(m.employeeId);
    }

    for (const empId of allIds) {
      // Remove previously applied RH components for this month
      await this.componentModel.destroy({
        where: {
          employeeId: empId,
          label: { [Op.like]: `%[RH ${tag}]%` },
        } as any,
      });
    }

    for (const adj of preview.employees) {
      if (adj.absenceDeduction > 0) {
        await this.componentModel.create({
          employeeId: adj.employeeId,
          type: 'RETENUE',
          label: `Absences injustifiées [RH ${tag}]`,
          amount: -adj.absenceDeduction,
          cnpsBase: true, taxable: true, isActive: true,
        } as any);
        applied++;
      }

      if (adj.unpaidLeaveDeduction > 0) {
        await this.componentModel.create({
          employeeId: adj.employeeId,
          type: 'RETENUE',
          label: `Congés sans solde [RH ${tag}]`,
          amount: -adj.unpaidLeaveDeduction,
          cnpsBase: true, taxable: true, isActive: true,
        } as any);
        applied++;
      }

      if (adj.pointsAdjustment > 0) {
        await this.componentModel.create({
          employeeId: adj.employeeId,
          type: 'PRIME',
          label: `Prime performance ${adj.points}pts [RH ${tag}]`,
          amount: adj.pointsAdjustment,
          cnpsBase: true, taxable: true, isActive: true,
        } as any);
        applied++;
      } else if (adj.pointsAdjustment < 0) {
        await this.componentModel.create({
          employeeId: adj.employeeId,
          type: 'RETENUE',
          label: `Malus performance ${adj.points}pts [RH ${tag}]`,
          amount: adj.pointsAdjustment,
          cnpsBase: true, taxable: true, isActive: true,
        } as any);
        applied++;
      }

      // Manual adjustments for this employee
      const manual = manualMap.get(adj.employeeId);
      if (manual) {
        for (const p of manual.primes) {
          if (p.amount > 0 && p.label.trim()) {
            await this.componentModel.create({
              employeeId: adj.employeeId,
              type: 'PRIME',
              label: `${p.label.trim()} [RH ${tag}]`,
              amount: p.amount,
              cnpsBase: true, taxable: true, isActive: true,
            } as any);
            applied++;
          }
        }
        for (const r of manual.retenus) {
          if (r.amount > 0 && r.label.trim()) {
            await this.componentModel.create({
              employeeId: adj.employeeId,
              type: 'RETENUE',
              label: `${r.label.trim()} [RH ${tag}]`,
              amount: -r.amount,
              cnpsBase: true, taxable: true, isActive: true,
            } as any);
            applied++;
          }
        }
      }
    }

    return { applied };
  }

  async getApplied(month: number, year: number) {
    const tag = this.monthTag(month, year);
    return this.componentModel.findAll({
      where: { label: { [Op.like]: `%[RH ${tag}]%` } } as any,
      include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  private monthTag(month: number, year: number): string {
    const names = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
    ];
    return `${names[month - 1]} ${year}`;
  }

  private getBracketFactor(points: number, brackets: PointsBracket[]): number {
    for (const b of brackets) {
      if (points >= b.minPoints && (b.maxPoints === null || points <= b.maxPoints)) {
        return b.factor;
      }
    }
    return 0;
  }

  private matchRecord(records: AttendanceRecord[], emp: Employee): AttendanceRecord | null {
    // eslint-disable-next-line no-control-regex
    const norm = (s: string) =>
      s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const full = norm(`${(emp as any).firstName} ${(emp as any).lastName}`);
    const last = norm((emp as any).lastName);

    for (const r of records) {
      const rec = norm((r as any).employeeName ?? '');
      if (rec === full || rec.includes(last) || full.includes(rec)) return r;
    }
    return null;
  }

  private workdaysInMonth(
    startDate: string,
    endDate: string,
    year: number,
    month: number,
  ): number {
    const monthStart = new Date(year, month - 1, 1).getTime();
    const monthEnd = new Date(year, month, 0).getTime();
    const start = new Date(Math.max(new Date(startDate).getTime(), monthStart));
    const end = new Date(Math.min(new Date(endDate).getTime(), monthEnd));
    if (end < start) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
}

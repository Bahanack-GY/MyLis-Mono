import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { TaxDeclaration } from '../models/tax-declaration.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { TvaService } from './tva.service';
import { IsService } from './is.service';
import { FiscalYearsService } from '../accounting/fiscal-years.service';
import { PayrollService } from '../payroll/payroll.service';

@Injectable()
export class TaxDeclarationsService {
    constructor(
        @InjectModel(TaxDeclaration)
        private declarationModel: typeof TaxDeclaration,
        private tvaService: TvaService,
        private isService: IsService,
        private fiscalYearsService: FiscalYearsService,
        private payrollService: PayrollService,
    ) {}

    async findAll(fiscalYearId?: string) {
        const where: any = {};
        if (fiscalYearId) where.fiscalYearId = fiscalYearId;

        return this.declarationModel.findAll({
            where,
            include: [{ model: FiscalYear, attributes: ['id', 'name'] }],
            order: [['dueDate', 'DESC']],
        });
    }

    async findOne(id: string) {
        const decl = await this.declarationModel.findByPk(id, {
            include: [FiscalYear],
        });
        if (!decl) throw new NotFoundException('Tax declaration not found');
        return decl;
    }

    async generateTva(month: number, year: number) {
        const fiscalYear = await this.fiscalYearsService.findOpenYear();
        const period = `${year}-${String(month).padStart(2, '0')}`;

        const existing = await this.declarationModel.findOne({ where: { type: 'TVA_MONTHLY', period } });
        const data = await this.tvaService.calculateMonthly(month, year);

        if (existing) {
            await existing.update({ data, totalAmount: data.tvaDue, dueDate: data.dueDate });
            return this.findOne(existing.id);
        }

        const decl = await this.declarationModel.create({
            type: 'TVA_MONTHLY', period, fiscalYearId: fiscalYear.id,
            status: 'DRAFT', data, totalAmount: data.tvaDue, dueDate: data.dueDate,
        } as any);
        return this.findOne(decl.id);
    }

    async generateIs(fiscalYearId: string) {
        const fiscalYear = await this.fiscalYearsService.findOne(fiscalYearId);
        const period = fiscalYear.name;

        const data = await this.isService.calculateAnnual(fiscalYearId);
        const endYear = new Date(fiscalYear.endDate).getFullYear();
        const dueDate = `${endYear + 1}-03-15`;

        const existing = await this.declarationModel.findOne({ where: { type: 'IS_ANNUAL', period } });
        if (existing) {
            await existing.update({ data, totalAmount: data.isDue });
            return this.findOne(existing.id);
        }

        const decl = await this.declarationModel.create({
            type: 'IS_ANNUAL', period, fiscalYearId,
            status: 'DRAFT', data, totalAmount: data.isDue, dueDate,
        } as any);
        return this.findOne(decl.id);
    }

    async generateCnps(month: number, year: number) {
        const fiscalYear = await this.fiscalYearsService.findOpenYear();
        const period = `${year}-${String(month).padStart(2, '0')}`;

        const runs = await this.payrollService.findAll();
        const run = runs.find((r: any) => r.month === month && r.year === year);

        const data: any = {
            period,
            totalGross: 0,
            totalPvidEmployee: 0,
            totalPvidEmployer: 0,
            totalPrestationsFamiliales: 0,
            totalAtmp: 0,
            totalCfcEmployee: 0,
            totalCfcEmployer: 0,
            totalFne: 0,
            totalCnpsEmployee: 0,
            totalCnpsEmployer: 0,
            totalCfc: 0,
            totalDue: 0,
            employeeCount: 0,
        };

        if (run) {
            const fullRun = await this.payrollService.findOne((run as any).id);
            const payslips: any[] = fullRun.payslips || [];
            data.employeeCount = payslips.length;
            data.totalGross = payslips.reduce((s: number, p: any) => s + (Number(p.grossSalary) || 0), 0);

            data.totalPvidEmployee = payslips.reduce((s: number, p: any) => s + (Number(p.pvidEmployee) || 0), 0);
            data.totalPvidEmployer = payslips.reduce((s: number, p: any) => s + (Number(p.pvidEmployer) || 0), 0);
            data.totalPrestationsFamiliales = payslips.reduce((s: number, p: any) => s + (Number(p.cnpsFamilyAllowance) || 0), 0);
            data.totalAtmp = payslips.reduce((s: number, p: any) => s + (Number(p.atmp) || 0), 0);
            data.totalCfcEmployee = payslips.reduce((s: number, p: any) => s + (Number(p.cfcEmployee) || 0), 0);
            data.totalCfcEmployer = payslips.reduce((s: number, p: any) => s + (Number(p.cfcEmployer) || 0), 0);
            data.totalFne = payslips.reduce((s: number, p: any) => s + (Number(p.fne) || 0), 0);

            // Legacy fallback for payslips calculated before 2026 fields were added
            if (data.totalPvidEmployee === 0 && data.totalPvidEmployer === 0) {
                data.totalPvidEmployee = payslips.reduce((s: number, p: any) => s + (Number(p.cnpsEmployee) || 0), 0);
                data.totalPvidEmployer = payslips.reduce((s: number, p: any) => s + (Number(p.cnpsEmployer) || 0), 0);
            }
            if (data.totalCfcEmployee === 0 && data.totalCfcEmployer === 0) {
                data.totalCfcEmployee = payslips.reduce((s: number, p: any) => s + (Number(p.cfc) || 0), 0);
            }

            data.totalCnpsEmployee = data.totalPvidEmployee;
            data.totalCnpsEmployer = data.totalPvidEmployer + data.totalPrestationsFamiliales + data.totalAtmp;
            data.totalCfc = data.totalCfcEmployee + data.totalCfcEmployer;
            data.totalDue = data.totalCnpsEmployee + data.totalCnpsEmployer + data.totalCfc + data.totalFne;
        }

        const dueDate = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-15`;

        const existing = await this.declarationModel.findOne({ where: { type: 'CNPS_MONTHLY', period } });
        if (existing) {
            await existing.update({ data, totalAmount: data.totalDue, dueDate });
            return this.findOne(existing.id);
        }

        const decl = await this.declarationModel.create({
            type: 'CNPS_MONTHLY', period, fiscalYearId: fiscalYear.id,
            status: 'DRAFT', data, totalAmount: data.totalDue, dueDate,
        } as any);
        return this.findOne(decl.id);
    }

    async generateIrpp(fiscalYearId: string) {
        const fiscalYear = await this.fiscalYearsService.findOne(fiscalYearId);
        const period = fiscalYear.name;

        const startDate = new Date(fiscalYear.startDate);
        const endDate = new Date(fiscalYear.endDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;

        const allRuns = await this.payrollService.findAll();
        const fiscalRuns = allRuns.filter((r: any) => {
            if (r.status !== 'PAID') return false;
            const afterStart = r.year > startYear || (r.year === startYear && r.month >= startMonth);
            const beforeEnd = r.year < endYear || (r.year === endYear && r.month <= endMonth);
            return afterStart && beforeEnd;
        });

        let totalIrpp = 0, totalCac = 0, totalRav = 0, totalTdl = 0;
        let totalGross = 0, employeeMonthCount = 0;

        for (const run of fiscalRuns) {
            const fullRun = await this.payrollService.findOne((run as any).id);
            const payslips: any[] = fullRun.payslips || [];
            for (const p of payslips) {
                totalIrpp += Number(p.irpp) || 0;
                totalCac += Number(p.cac) || 0;
                totalRav += Number(p.rav) || 0;
                totalTdl += Number(p.tdl) || 0;
                totalGross += Number(p.grossSalary) || 0;
                employeeMonthCount++;
            }
        }

        const totalDue = Math.round(totalIrpp + totalCac + totalRav + totalTdl);
        const dueDate = `${endYear + 1}-03-15`;

        const data = {
            totalIrpp: Math.round(totalIrpp),
            totalCac: Math.round(totalCac),
            totalRav: Math.round(totalRav),
            totalTdl: Math.round(totalTdl),
            totalDue,
            totalGross: Math.round(totalGross),
            payrollRunCount: fiscalRuns.length,
            employeeMonthCount,
        };

        const existing = await this.declarationModel.findOne({ where: { type: 'IRPP_ANNUAL', period } });
        if (existing) {
            await existing.update({ data, totalAmount: totalDue, dueDate });
            return this.findOne(existing.id);
        }

        const decl = await this.declarationModel.create({
            type: 'IRPP_ANNUAL', period, fiscalYearId,
            status: 'DRAFT', data, totalAmount: totalDue, dueDate,
        } as any);
        return this.findOne(decl.id);
    }

    async generateIsQuarterly(fiscalYearId: string) {
        const fiscalYear = await this.fiscalYearsService.findOne(fiscalYearId);
        const isData = await this.isService.calculateAnnual(fiscalYearId);
        const quarterly = isData.quarterlyAdvance;
        const startYear = new Date(fiscalYear.startDate).getFullYear();

        const quarters = [
            { period: `${startYear}-Q1`, label: 'T1', dueDate: `${startYear}-03-15` },
            { period: `${startYear}-Q2`, label: 'T2', dueDate: `${startYear}-06-15` },
            { period: `${startYear}-Q3`, label: 'T3', dueDate: `${startYear}-09-15` },
            { period: `${startYear}-Q4`, label: 'T4', dueDate: `${startYear}-12-15` },
        ];

        const results: TaxDeclaration[] = [];
        for (const q of quarters) {
            const data = {
                quarter: q.label,
                annualIsDue: isData.isDue,
                quarterlyAmount: quarterly,
                isRate: isData.isRate,
                regime: isData.regime,
            };

            const existing = await this.declarationModel.findOne({
                where: { type: 'IS_QUARTERLY_ADVANCE', period: q.period },
            });
            if (existing) {
                await existing.update({ data, totalAmount: quarterly, dueDate: q.dueDate });
                results.push(await this.findOne(existing.id));
            } else {
                const decl = await this.declarationModel.create({
                    type: 'IS_QUARTERLY_ADVANCE', period: q.period, fiscalYearId,
                    status: 'DRAFT', data, totalAmount: quarterly, dueDate: q.dueDate,
                } as any);
                results.push(await this.findOne(decl.id));
            }
        }
        return results;
    }

    async generateDsf(fiscalYearId: string) {
        const fiscalYear = await this.fiscalYearsService.findOne(fiscalYearId);
        const period = fiscalYear.name;

        const incomeData = await this.isService.calculateAnnual(fiscalYearId);

        const startDate = new Date(fiscalYear.startDate);
        const endDate = new Date(fiscalYear.endDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;

        const allRuns = await this.payrollService.findAll();
        const fiscalRuns = allRuns.filter((r: any) => {
            if (r.status !== 'PAID') return false;
            const afterStart = r.year > startYear || (r.year === startYear && r.month >= startMonth);
            const beforeEnd = r.year < endYear || (r.year === endYear && r.month <= endMonth);
            return afterStart && beforeEnd;
        });

        let totalGross = 0, totalNet = 0, totalIrpp = 0, totalCnps = 0;
        let maxEmployees = 0;

        for (const run of fiscalRuns) {
            const fullRun = await this.payrollService.findOne((run as any).id);
            const payslips: any[] = fullRun.payslips || [];
            maxEmployees = Math.max(maxEmployees, payslips.length);
            for (const p of payslips) {
                totalGross += Number(p.grossSalary) || 0;
                totalNet += Number(p.netSalary) || 0;
                totalIrpp += Number(p.irpp) || 0;
                const cnpsEmp = Number(p.pvidEmployee) || Number(p.cnpsEmployee) || 0;
                const cnpsEmplr = Number(p.pvidEmployer) || Number(p.cnpsEmployer) || 0;
                totalCnps += cnpsEmp + cnpsEmplr;
            }
        }

        const dueDate = `${endYear + 1}-03-31`;

        const data = {
            fiscalYearName: fiscalYear.name,
            totalRevenue: Math.round(incomeData.turnover),
            totalExpenses: Math.round(incomeData.totalExpenses),
            netIncome: Math.round(incomeData.taxableProfit),
            totalPayroll: Math.round(totalGross),
            totalNetPayroll: Math.round(totalNet),
            totalIrpp: Math.round(totalIrpp),
            totalCnps: Math.round(totalCnps),
            totalEmployees: maxEmployees,
            payrollRunCount: fiscalRuns.length,
        };

        const existing = await this.declarationModel.findOne({ where: { type: 'DSF', period } });
        if (existing) {
            await existing.update({ data, totalAmount: 0, dueDate });
            return this.findOne(existing.id);
        }

        const decl = await this.declarationModel.create({
            type: 'DSF', period, fiscalYearId,
            status: 'DRAFT', data, totalAmount: 0, dueDate,
        } as any);
        return this.findOne(decl.id);
    }

    async validate(id: string, userId: string) {
        const decl = await this.findOne(id);
        if (decl.status === 'VALIDATED') return decl;
        await decl.update({ status: 'VALIDATED', validatedByUserId: userId });
        return this.findOne(id);
    }

    async markFiled(id: string) {
        const decl = await this.findOne(id);
        if (decl.status !== 'VALIDATED') {
            throw new BadRequestException('Can only file VALIDATED declarations');
        }
        await decl.update({ status: 'FILED', filedAt: new Date() });
        return this.findOne(id);
    }

    async getUpcoming() {
        const today = new Date().toISOString().split('T')[0];
        return this.declarationModel.findAll({
            where: {
                status: { [Op.ne]: 'FILED' },
                dueDate: { [Op.gte]: today },
            },
            include: [{ model: FiscalYear, attributes: ['id', 'name'] }],
            order: [['dueDate', 'ASC']],
            limit: 10,
        });
    }
}

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

    /**
     * Generate a monthly TVA declaration
     */
    async generateTva(month: number, year: number) {
        const fiscalYear = await this.fiscalYearsService.findOpenYear();
        const period = `${year}-${String(month).padStart(2, '0')}`;

        // Check if already exists
        const existing = await this.declarationModel.findOne({
            where: { type: 'TVA_MONTHLY', period },
        });
        if (existing) {
            // Re-calculate and update
            const data = await this.tvaService.calculateMonthly(month, year);
            await existing.update({
                data,
                totalAmount: data.tvaDue,
                dueDate: data.dueDate,
            });
            return this.findOne(existing.id);
        }

        const data = await this.tvaService.calculateMonthly(month, year);

        const decl = await this.declarationModel.create({
            type: 'TVA_MONTHLY',
            period,
            fiscalYearId: fiscalYear.id,
            status: 'DRAFT',
            data,
            totalAmount: data.tvaDue,
            dueDate: data.dueDate,
        } as any);

        return this.findOne(decl.id);
    }

    /**
     * Generate an annual IS declaration
     */
    async generateIs(fiscalYearId: string) {
        const fiscalYear = await this.fiscalYearsService.findOne(fiscalYearId);
        const period = fiscalYear.name;

        const existing = await this.declarationModel.findOne({
            where: { type: 'IS_ANNUAL', period },
        });
        if (existing) {
            const data = await this.isService.calculateAnnual(fiscalYearId);
            await existing.update({
                data,
                totalAmount: data.isDue,
            });
            return this.findOne(existing.id);
        }

        const data = await this.isService.calculateAnnual(fiscalYearId);
        const endYear = new Date(fiscalYear.endDate).getFullYear();

        const decl = await this.declarationModel.create({
            type: 'IS_ANNUAL',
            period,
            fiscalYearId,
            status: 'DRAFT',
            data,
            totalAmount: data.isDue,
            dueDate: `${endYear + 1}-03-15`, // March 15 of following year
        } as any);

        return this.findOne(decl.id);
    }

    /**
     * Generate a monthly CNPS declaration
     */
    async generateCnps(month: number, year: number) {
        const fiscalYear = await this.fiscalYearsService.findOpenYear();
        const period = `${year}-${String(month).padStart(2, '0')}`;

        const runs = await this.payrollService.findAll();
        const run = runs.find((r: any) => r.month === month && r.year === year);

        const data = {
            period,
            totalGross: run ? Number(run.totalGross) : 0,
            totalCnpsEmployee: 0,
            totalCnpsEmployer: 0,
            totalDue: 0,
            employeeCount: 0,
        };

        if (run) {
            const fullRun = await this.payrollService.findOne(run.id);
            data.employeeCount = fullRun.payslips?.length || 0;
            data.totalCnpsEmployee = fullRun.payslips?.reduce((sum: number, p: any) => sum + (Number(p.cnpsEmployee) || 0), 0) || 0;
            data.totalCnpsEmployer = fullRun.payslips?.reduce((sum: number, p: any) => sum + (Number(p.cnpsEmployer) || 0), 0) || 0;
            data.totalDue = data.totalCnpsEmployee + data.totalCnpsEmployer;
        }

        const existing = await this.declarationModel.findOne({
            where: { type: 'CNPS_MONTHLY', period },
        });

        const dueDate = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-15`;

        if (existing) {
            await existing.update({ data, totalAmount: data.totalDue, dueDate });
            return this.findOne(existing.id);
        }

        const decl = await this.declarationModel.create({
            type: 'CNPS_MONTHLY',
            period,
            fiscalYearId: fiscalYear.id,
            status: 'DRAFT',
            data,
            totalAmount: data.totalDue,
            dueDate,
        } as any);

        return this.findOne(decl.id);
    }

    /**
     * Mark a declaration as validated
     */
    async validate(id: string, userId: string) {
        const decl = await this.findOne(id);
        if (decl.status === 'VALIDATED') return decl;
        await decl.update({
            status: 'VALIDATED',
            validatedByUserId: userId,
        });
        return this.findOne(id);
    }

    /**
     * Mark a declaration as filed
     */
    async markFiled(id: string) {
        const decl = await this.findOne(id);
        if (decl.status !== 'VALIDATED') {
            throw new BadRequestException('Can only file VALIDATED declarations');
        }
        await decl.update({
            status: 'FILED',
            filedAt: new Date(),
        });
        return this.findOne(id);
    }

    /**
     * Get upcoming tax obligations
     */
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

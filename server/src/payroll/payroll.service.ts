import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PayrollRun } from '../models/payroll-run.model';
import { Payslip } from '../models/payslip.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Expense } from '../models/expense.model';
import { DeductionType } from '../models/deduction-type.model';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { JournalEngineService } from '../accounting/journal-engine.service';

@Injectable()
export class PayrollService {
    constructor(
        @InjectModel(PayrollRun)
        private payrollRunModel: typeof PayrollRun,
        @InjectModel(Payslip)
        private payslipModel: typeof Payslip,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Expense)
        private expenseModel: typeof Expense,
        @InjectModel(DeductionType)
        private deductionTypeModel: typeof DeductionType,
        @InjectConnection()
        private sequelize: Sequelize,
        private calculator: PayrollCalculatorService,
        private journalEngine: JournalEngineService,
    ) {}

    async findAll() {
        return this.payrollRunModel.findAll({
            include: [{ model: User, as: 'validatedBy', attributes: ['id', 'email'] }],
            order: [['year', 'DESC'], ['month', 'DESC']],
        });
    }

    async findOne(id: string) {
        const run = await this.payrollRunModel.findByPk(id, {
            include: [
                { model: User, as: 'validatedBy', attributes: ['id', 'email'] },
                {
                    model: Payslip,
                    include: [
                        {
                            model: Employee,
                            attributes: ['id', 'firstName', 'lastName'],
                            include: [{ model: Department, attributes: ['id', 'name'] }],
                        },
                    ],
                },
            ],
        });
        if (!run) throw new NotFoundException('Payroll run not found');
        return run;
    }

    async findPayslip(id: string) {
        const payslip = await this.payslipModel.findByPk(id, {
            include: [
                {
                    model: Employee,
                    attributes: ['id', 'firstName', 'lastName', 'salary'],
                    include: [
                        { model: Department, attributes: ['id', 'name'] },
                        { model: User, attributes: ['role'] },
                    ],
                },
                { model: PayrollRun, attributes: ['id', 'month', 'year', 'status'] },
            ],
        });
        if (!payslip) throw new NotFoundException('Payslip not found');
        return payslip;
    }

    /**
     * Create a new payroll run for a given month/year
     */
    async create(month: number, year: number) {
        const existing = await this.payrollRunModel.findOne({ where: { month, year } });
        if (existing) throw new BadRequestException(`Payroll run for ${month}/${year} already exists`);

        return this.payrollRunModel.create({
            month,
            year,
            status: 'DRAFT',
            totalGross: 0,
            totalNet: 0,
            totalEmployerCharges: 0,
        } as any);
    }

    /**
     * Calculate all payslips for a payroll run
     */
    async calculate(id: string) {
        const run = await this.findOne(id);
        if (run.status !== 'DRAFT' && run.status !== 'CALCULATED') {
            throw new BadRequestException('Can only calculate DRAFT or CALCULATED payroll runs');
        }

        // Get all active employees with salary > 0
        const employees = await this.employeeModel.findAll({
            where: { dismissed: false },
            include: [{ model: User, attributes: ['role'] }],
        });

        const eligibleEmployees = employees.filter(e => Number(e.getDataValue('salary')) > 0);

        // If re-calculating, preserve existing toggles & custom deductions per employee
        const existingPayslips = run.payslips || [];
        const existingByEmployee = new Map<string, Payslip>();
        existingPayslips.forEach(ps => existingByEmployee.set(ps.employeeId, ps));

        return this.sequelize.transaction(async (t) => {
            // Delete existing payslips for this run (re-calculation)
            await this.payslipModel.destroy({ where: { payrollRunId: id }, transaction: t });

            let totalGross = 0;
            let totalNet = 0;
            let totalEmployerCharges = 0;

            for (const emp of eligibleEmployees) {
                const grossSalary = Number(emp.getDataValue('salary'));

                // Preserve toggles from previous calculation if re-calculating
                const prev = existingByEmployee.get(emp.id);
                const toggles = prev ? {
                    includeCnps: prev.includeCnps,
                    includeCfc: prev.includeCfc,
                    includeIrpp: prev.includeIrpp,
                    includeCommunalTax: prev.includeCommunalTax,
                } : undefined;
                const customDeductions = prev?.customDeductions || [];
                const manualDeductions = prev ? Number(prev.manualDeductions) || 0 : 0;
                const manualDeductionNote = prev?.manualDeductionNote || null;

                const calc = this.calculator.calculate(grossSalary, toggles, customDeductions);

                const netAfterManual = calc.netSalary - manualDeductions;

                await this.payslipModel.create({
                    payrollRunId: id,
                    employeeId: emp.id,
                    grossSalary: calc.grossSalary,
                    netSalary: netAfterManual,
                    cnpsEmployee: calc.cnpsEmployee,
                    cnpsEmployer: calc.cnpsEmployer,
                    irpp: calc.irpp,
                    cfc: calc.cfc,
                    communalTax: calc.communalTax,
                    totalDeductions: calc.totalDeductions,
                    totalEmployerCharges: calc.totalEmployerCharges,
                    details: calc.details,
                    includeCnps: toggles?.includeCnps ?? true,
                    includeCfc: toggles?.includeCfc ?? true,
                    includeIrpp: toggles?.includeIrpp ?? true,
                    includeCommunalTax: toggles?.includeCommunalTax ?? true,
                    customDeductions,
                    manualDeductions,
                    manualDeductionNote,
                } as any, { transaction: t });

                totalGross += calc.grossSalary;
                totalNet += netAfterManual;
                totalEmployerCharges += calc.totalEmployerCharges;
            }

            await run.update({
                status: 'CALCULATED',
                calculatedAt: new Date(),
                totalGross: Math.round(totalGross),
                totalNet: Math.round(totalNet),
                totalEmployerCharges: Math.round(totalEmployerCharges),
            }, { transaction: t });

            return this.findOne(id);
        });
    }

    /**
     * Validate a payroll run (lock it)
     */
    async validate(id: string, userId: string) {
        const run = await this.findOne(id);
        if (run.status !== 'CALCULATED') {
            throw new BadRequestException('Can only validate CALCULATED payroll runs');
        }
        await run.update({
            status: 'VALIDATED',
            validatedAt: new Date(),
            validatedByUserId: userId,
        });
        return this.findOne(id);
    }

    /**
     * Pay a validated payroll run — creates Expense records + journal entries for all unpaid payslips
     */
    async pay(id: string, userId: string) {
        const run = await this.findOne(id);
        if (run.status !== 'VALIDATED') {
            throw new BadRequestException('Can only pay VALIDATED payroll runs');
        }

        const defaultDate = `${run.year}-${String(run.month).padStart(2, '0')}-01`;
        const unpaidPayslips = run.payslips.filter(ps => !ps.paymentDate);

        return this.sequelize.transaction(async (t) => {
            for (const payslip of unpaidPayslips) {
                const emp = payslip.employee;
                const name = `${emp.getDataValue('firstName') || ''} ${emp.getDataValue('lastName') || ''}`.trim();
                const date = defaultDate;

                const title = `Salaire - ${name}`;
                const existing = await this.expenseModel.findOne({
                    where: { title, category: 'Salaire', date } as any,
                    transaction: t,
                });
                if (!existing) {
                    await this.expenseModel.create({
                        title,
                        amount: payslip.grossSalary,
                        category: 'Salaire',
                        type: 'ONE_TIME',
                        date,
                    } as any, { transaction: t });
                }

                await this.journalEngine.onSalaryPaid({
                    employeeName: name,
                    grossSalary: Number(payslip.grossSalary),
                    netSalary: Number(payslip.netSalary),
                    cnpsEmployee: Number(payslip.cnpsEmployee),
                    cnpsEmployer: Number(payslip.cnpsEmployer),
                    irpp: Number(payslip.irpp),
                    cfc: Number(payslip.cfc),
                    communalTax: Number(payslip.communalTax),
                    date,
                    sourceId: payslip.id,
                    userId,
                });

                await payslip.update({ paymentDate: date }, { transaction: t });
            }

            await run.update({ status: 'PAID', paidAt: new Date() }, { transaction: t });
            return this.findOne(id);
        });
    }

    /**
     * Pay a single payslip on a specific date (individual payment)
     */
    async payOne(payslipId: string, date: string, userId: string) {
        const payslip = await this.payslipModel.findByPk(payslipId, {
            include: [
                { model: PayrollRun, attributes: ['id', 'status', 'month', 'year'] },
                {
                    model: Employee,
                    attributes: ['id', 'firstName', 'lastName'],
                    include: [{ model: Department, attributes: ['id', 'name'] }],
                },
            ],
        });
        if (!payslip) throw new NotFoundException('Payslip not found');
        if (payslip.payrollRun.status !== 'VALIDATED') {
            throw new BadRequestException('Payroll run must be VALIDATED to pay individual payslips');
        }
        if (payslip.paymentDate) {
            throw new BadRequestException('This payslip has already been paid');
        }

        const emp = payslip.employee;
        const name = `${emp.getDataValue('firstName') || ''} ${emp.getDataValue('lastName') || ''}`.trim();

        return this.sequelize.transaction(async (t) => {
            const title = `Salaire - ${name}`;
            const existing = await this.expenseModel.findOne({
                where: { title, category: 'Salaire', date } as any,
                transaction: t,
            });
            if (!existing) {
                await this.expenseModel.create({
                    title,
                    amount: payslip.grossSalary,
                    category: 'Salaire',
                    type: 'ONE_TIME',
                    date,
                } as any, { transaction: t });
            }

            await this.journalEngine.onSalaryPaid({
                employeeName: name,
                grossSalary: Number(payslip.grossSalary),
                netSalary: Number(payslip.netSalary),
                cnpsEmployee: Number(payslip.cnpsEmployee),
                cnpsEmployer: Number(payslip.cnpsEmployer),
                irpp: Number(payslip.irpp),
                cfc: Number(payslip.cfc),
                communalTax: Number(payslip.communalTax),
                date,
                sourceId: payslip.id,
                userId,
            });

            await payslip.update({ paymentDate: date }, { transaction: t });

            // If all payslips in this run are now paid, mark run as PAID
            const allPayslips = await this.payslipModel.findAll({
                where: { payrollRunId: payslip.payrollRunId },
                transaction: t,
            });
            const allPaid = allPayslips.every(ps =>
                ps.id === payslipId || ps.paymentDate != null,
            );
            if (allPaid) {
                await this.payrollRunModel.update(
                    { status: 'PAID', paidAt: new Date() },
                    { where: { id: payslip.payrollRunId }, transaction: t },
                );
            }

            return this.findPayslip(payslipId);
        });
    }

    /**
     * Preview calculation for a single employee (without saving)
     */
    async preview(grossSalary: number) {
        return this.calculator.calculate(grossSalary);
    }

    /**
     * Update manual deductions on a payslip (only for CALCULATED runs)
     */
    async updatePayslipDeductions(payslipId: string, manualDeductions: number, manualDeductionNote?: string) {
        const payslip = await this.payslipModel.findByPk(payslipId, {
            include: [{ model: PayrollRun, attributes: ['id', 'status'] }],
        });
        if (!payslip) throw new NotFoundException('Payslip not found');
        if (payslip.payrollRun.status !== 'CALCULATED') {
            throw new BadRequestException('Manual deductions can only be edited on CALCULATED payroll runs');
        }

        const autoDeductions = Number(payslip.totalDeductions);
        const customTotal = (payslip.customDeductions || []).reduce((s, d) => s + d.amount, 0);
        const gross = Number(payslip.grossSalary);
        const newNet = Math.round(gross - autoDeductions - customTotal - manualDeductions);

        await payslip.update({
            manualDeductions,
            manualDeductionNote: manualDeductionNote || null,
            netSalary: newNet,
        });

        await this.recalcRunTotals(payslip.payrollRunId);
        return this.findPayslip(payslipId);
    }

    /**
     * Update toggles and custom deductions on a payslip, then recalculate it
     */
    async updatePayslipToggles(
        payslipId: string,
        body: {
            includeCnps?: boolean;
            includeCfc?: boolean;
            includeIrpp?: boolean;
            includeCommunalTax?: boolean;
            customDeductions?: { name: string; amount: number }[];
        },
    ) {
        const payslip = await this.payslipModel.findByPk(payslipId, {
            include: [{ model: PayrollRun, attributes: ['id', 'status'] }],
        });
        if (!payslip) throw new NotFoundException('Payslip not found');
        if (payslip.payrollRun.status !== 'CALCULATED') {
            throw new BadRequestException('Toggles can only be edited on CALCULATED payroll runs');
        }

        const toggles = {
            includeCnps: body.includeCnps ?? payslip.includeCnps,
            includeCfc: body.includeCfc ?? payslip.includeCfc,
            includeIrpp: body.includeIrpp ?? payslip.includeIrpp,
            includeCommunalTax: body.includeCommunalTax ?? payslip.includeCommunalTax,
        };
        const customDeductions = body.customDeductions ?? payslip.customDeductions ?? [];

        const gross = Number(payslip.grossSalary);
        const manualDeductions = Number(payslip.manualDeductions) || 0;
        const calc = this.calculator.calculate(gross, toggles, customDeductions);

        await payslip.update({
            ...toggles,
            customDeductions,
            cnpsEmployee: calc.cnpsEmployee,
            cnpsEmployer: calc.cnpsEmployer,
            cfc: calc.cfc,
            irpp: calc.irpp,
            communalTax: calc.communalTax,
            totalDeductions: calc.totalDeductions,
            totalEmployerCharges: calc.totalEmployerCharges,
            netSalary: calc.netSalary - manualDeductions,
            details: calc.details,
        });

        await this.recalcRunTotals(payslip.payrollRunId);
        return this.findPayslip(payslipId);
    }

    /**
     * Recalculate payroll run totals from its payslips
     */
    private async recalcRunTotals(runId: string) {
        const allPayslips = await this.payslipModel.findAll({ where: { payrollRunId: runId } });
        const totalNet = allPayslips.reduce((s, ps) => s + Number(ps.netSalary), 0);
        const totalGross = allPayslips.reduce((s, ps) => s + Number(ps.grossSalary), 0);
        const totalEmployerCharges = allPayslips.reduce((s, ps) => s + Number(ps.totalEmployerCharges), 0);
        await this.payrollRunModel.update(
            { totalNet: Math.round(totalNet), totalGross: Math.round(totalGross), totalEmployerCharges: Math.round(totalEmployerCharges) },
            { where: { id: runId } },
        );
    }

    /**
     * Get all PAID payslips for the authenticated user
     */
    async findMyPayslips(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee record not found');

        const payslips = await this.payslipModel.findAll({
            where: { employeeId: employee.id },
            include: [
                {
                    model: PayrollRun,
                    attributes: ['id', 'month', 'year', 'status', 'paidAt'],
                    where: { status: 'PAID' },
                },
                {
                    model: Employee,
                    attributes: ['id', 'firstName', 'lastName'],
                    include: [{ model: Department, attributes: ['id', 'name'] }],
                },
            ],
            order: [[{ model: PayrollRun, as: 'payrollRun' }, 'year', 'DESC'], [{ model: PayrollRun, as: 'payrollRun' }, 'month', 'DESC']],
        });

        // Ensure all numeric fields are properly serialized
        return payslips.map(ps => ({
            ...ps.toJSON(),
            grossSalary: Number(ps.grossSalary) || 0,
            netSalary: Number(ps.netSalary) || 0,
            cnpsEmployee: Number(ps.cnpsEmployee) || 0,
            cnpsEmployer: Number(ps.cnpsEmployer) || 0,
            irpp: Number(ps.irpp) || 0,
            cfc: Number(ps.cfc) || 0,
            communalTax: Number(ps.communalTax) || 0,
            totalDeductions: Number(ps.totalDeductions) || 0,
            totalEmployerCharges: Number(ps.totalEmployerCharges) || 0,
            manualDeductions: Number(ps.manualDeductions) || 0,
        }));
    }

    /* ── Employee salary management (merged from old SalaryModule) ── */

    async findAllEmployees() {
        const employees = await this.employeeModel.findAll({
            where: { dismissed: false },
            include: [
                { model: User, attributes: ['role'] },
                { model: Department, attributes: ['id', 'name'] },
            ],
            order: [['firstName', 'ASC']],
        });
        return employees.map(e => {
            const plain = e.get({ plain: true }) as any;
            return {
                id: plain.id,
                firstName: plain.firstName || '',
                lastName: plain.lastName || '',
                departmentId: plain.departmentId || null,
                departmentName: plain.department?.name || '',
                role: plain.user?.role || 'EMPLOYEE',
                salary: Number(plain.salary) || 0,
            };
        });
    }

    async updateSalary(employeeId: string, salary: number) {
        const employee = await this.employeeModel.findByPk(employeeId);
        if (!employee) throw new NotFoundException('Employee not found');
        await employee.update({ salary });
        return { id: employeeId, salary };
    }

    async payAdvance(employeeId: string, amount: number, userId: string, note?: string) {
        const employee = await this.employeeModel.findByPk(employeeId);
        if (!employee) throw new NotFoundException('Employee not found');

        const name = `${employee.getDataValue('firstName') || ''} ${employee.getDataValue('lastName') || ''}`.trim();
        const date = new Date().toISOString().split('T')[0];

        const expense = await this.expenseModel.create({
            title: `Avance sur salaire - ${name}${note ? ` (${note})` : ''}`,
            amount,
            category: 'Avance sur salaire',
            type: 'ONE_TIME',
            date,
        } as any);

        // Create GL entry: Debit 422000 (Personnel - Avances) / Credit 521000 (Banque)
        await this.journalEngine.onExpenseCreated(expense, userId);

        return { employeeId, name, amount, date };
    }

    /* ── Deduction Types CRUD ── */

    async findAllDeductionTypes() {
        return this.deductionTypeModel.findAll({ order: [['name', 'ASC']] });
    }

    async createDeductionType(dto: { name: string; isPercentage?: boolean; defaultAmount?: number }) {
        return this.deductionTypeModel.create(dto as any);
    }

    async updateDeductionType(id: string, dto: any) {
        const dt = await this.deductionTypeModel.findByPk(id);
        if (!dt) throw new NotFoundException('Deduction type not found');
        return dt.update(dto);
    }

    async deleteDeductionType(id: string) {
        const dt = await this.deductionTypeModel.findByPk(id);
        if (!dt) throw new NotFoundException('Deduction type not found');
        await dt.destroy();
        return { success: true };
    }

    /* ── Bulk toggle update ── */

    async bulkUpdateToggles(
        runId: string,
        payslipIds: string[],
        toggles?: Partial<{
            includeCnps: boolean;
            includeCfc: boolean;
            includeIrpp: boolean;
            includeCommunalTax: boolean;
        }>,
        customDeductionAction?: { type: 'add'; deduction: { name: string; amount: number } } | { type: 'remove'; name: string },
    ) {
        const run = await this.payrollRunModel.findByPk(runId);
        if (!run) throw new NotFoundException('Payroll run not found');
        if (run.status !== 'CALCULATED') {
            throw new BadRequestException('Bulk toggles can only be applied on CALCULATED payroll runs');
        }

        const payslips = await this.payslipModel.findAll({
            where: { payrollRunId: runId, id: payslipIds },
        });

        if (payslips.length === 0) {
            throw new BadRequestException('No matching payslips found');
        }

        await this.sequelize.transaction(async (t) => {
            for (const payslip of payslips) {
                const newToggles = {
                    includeCnps: toggles?.includeCnps ?? payslip.includeCnps,
                    includeCfc: toggles?.includeCfc ?? payslip.includeCfc,
                    includeIrpp: toggles?.includeIrpp ?? payslip.includeIrpp,
                    includeCommunalTax: toggles?.includeCommunalTax ?? payslip.includeCommunalTax,
                };

                let customDeductions = payslip.customDeductions || [];
                if (customDeductionAction) {
                    if (customDeductionAction.type === 'add') {
                        customDeductions = [...customDeductions, customDeductionAction.deduction];
                    } else {
                        customDeductions = customDeductions.filter(d => d.name !== customDeductionAction.name);
                    }
                }

                const gross = Number(payslip.grossSalary);
                const manualDeductions = Number(payslip.manualDeductions) || 0;
                const calc = this.calculator.calculate(gross, newToggles, customDeductions);

                await payslip.update({
                    ...newToggles,
                    customDeductions,
                    cnpsEmployee: calc.cnpsEmployee,
                    cnpsEmployer: calc.cnpsEmployer,
                    cfc: calc.cfc,
                    irpp: calc.irpp,
                    communalTax: calc.communalTax,
                    totalDeductions: calc.totalDeductions,
                    totalEmployerCharges: calc.totalEmployerCharges,
                    netSalary: calc.netSalary - manualDeductions,
                    details: calc.details,
                }, { transaction: t });
            }
        });

        await this.recalcRunTotals(runId);
        return this.findOne(runId);
    }
}

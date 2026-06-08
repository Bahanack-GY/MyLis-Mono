import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { PayrollRun } from './payroll-run.model';
import { Employee } from './employee.model';

@Table({
    tableName: 'payslips',
    indexes: [
        { fields: ['payrollRunId'] },
        { fields: ['employeeId'] },
        { fields: ['payrollRunId', 'employeeId'], unique: true },
    ],
})
export class Payslip extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => PayrollRun)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare payrollRunId: string;

    @BelongsTo(() => PayrollRun)
    declare payrollRun: PayrollRun;

    @ForeignKey(() => Employee)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare grossSalary: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare netSalary: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare cnpsEmployee: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare cnpsEmployer: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare irpp: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare cfc: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare communalTax: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalDeductions: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalEmployerCharges: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare manualDeductions: number;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare manualDeductionNote: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare details: any;

    // ── 2026 Cameroon compliance fields (all nullable for backward compat) ──

    // CNPS Pension Vieillesse-Invalidité-Décès (PVID): 4.2% employee + 4.2% employer, ceiling 750k
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare pvidEmployee: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare pvidEmployer: number;

    // CNPS Prestations Familiales: 7% employer-only, ceiling 750k
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare cnpsFamilyAllowance: number;

    // CNPS AT/MP: employer-only (1.75/2.5/5%), no ceiling
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare atmp: number;

    // CFC employee (1%) and employer (1.5%), no ceiling
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare cfcEmployee: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare cfcEmployer: number;

    // FNE: 1% employer-only, no ceiling
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare fne: number;

    // RAV: employee-only, monthly bracket
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare rav: number;

    // TDL (Taxe de Développement Local): employee-only, annual bracket prorated monthly
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare tdl: number;

    // Centimes Additionnels Communaux on IRPP (10%)
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0 })
    declare cac: number;

    // Salary breakdown for payslip display
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
    declare baseSalary: number | null;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
    declare grossTaxable: number | null;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
    declare grossCotisable: number | null;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
    declare netCategoriel: number | null;

    // CNPS risk class used for AT/MP calculation
    @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 1 })
    declare riskClass: number | null;

    // Compliance warnings generated during calculation
    @Column({ type: DataType.JSONB, allowNull: true })
    declare complianceWarnings: string[] | null;

    /* ── Deduction toggles (default: all enabled) ── */

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare includeCnps: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare includeCfc: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare includeIrpp: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare includeCommunalTax: boolean;

    /* ── Custom deductions: [{name, amount}] ── */

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        defaultValue: [],
    })
    declare customDeductions: { name: string; amount: number }[];

    /* ── Individual payment date (null = not yet paid) ── */

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare paymentDate: string | null;
}

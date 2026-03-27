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
}

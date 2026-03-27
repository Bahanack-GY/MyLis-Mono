import { Column, DataType, Model, Table, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { Payslip } from './payslip.model';

@Table({
    tableName: 'payroll_runs',
    indexes: [
        { fields: ['month', 'year'], unique: true },
        { fields: ['status'] },
    ],
})
export class PayrollRun extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare month: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare year: number;

    @Column({
        type: DataType.ENUM('DRAFT', 'CALCULATED', 'VALIDATED', 'PAID'),
        allowNull: false,
        defaultValue: 'DRAFT',
    })
    declare status: 'DRAFT' | 'CALCULATED' | 'VALIDATED' | 'PAID';

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalGross: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalNet: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalEmployerCharges: number;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare calculatedAt: Date | null;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare validatedAt: Date | null;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare validatedByUserId: string | null;

    @BelongsTo(() => User)
    declare validatedBy: User;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare paidAt: Date | null;

    @HasMany(() => Payslip)
    declare payslips: Payslip[];
}

import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { FiscalYear } from './fiscal-year.model';
import { User } from './user.model';

@Table({
    tableName: 'tax_declarations',
    indexes: [
        { fields: ['type', 'period'], unique: true },
        { fields: ['fiscalYearId'] },
        { fields: ['status'] },
        { fields: ['dueDate'] },
    ],
})
export class TaxDeclaration extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.ENUM('TVA_MONTHLY', 'IS_ANNUAL', 'IS_QUARTERLY_ADVANCE', 'IRPP_ANNUAL', 'CNPS_MONTHLY', 'DSF'),
        allowNull: false,
    })
    declare type: 'TVA_MONTHLY' | 'IS_ANNUAL' | 'IS_QUARTERLY_ADVANCE' | 'IRPP_ANNUAL' | 'CNPS_MONTHLY' | 'DSF';

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare period: string;

    @ForeignKey(() => FiscalYear)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare fiscalYearId: string;

    @BelongsTo(() => FiscalYear)
    declare fiscalYear: FiscalYear;

    @Column({
        type: DataType.ENUM('DRAFT', 'VALIDATED', 'FILED'),
        allowNull: false,
        defaultValue: 'DRAFT',
    })
    declare status: 'DRAFT' | 'VALIDATED' | 'FILED';

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare data: any;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalAmount: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare dueDate: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare filedAt: Date | null;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare validatedByUserId: string | null;

    @BelongsTo(() => User)
    declare validatedBy: User;
}

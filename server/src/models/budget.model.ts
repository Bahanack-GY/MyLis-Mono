import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { FiscalYear } from './fiscal-year.model';
import { Account } from './account.model';
import { Department } from './department.model';

@Table({
    tableName: 'budgets',
    indexes: [
        { fields: ['fiscalYearId'] },
        { fields: ['accountId'] },
        { fields: ['departmentId'] },
    ],
})
export class Budget extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => FiscalYear)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare fiscalYearId: string;

    @BelongsTo(() => FiscalYear)
    declare fiscalYear: FiscalYear;

    @ForeignKey(() => Account)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare accountId: string | null;

    @BelongsTo(() => Account)
    declare account: Account;

    @ForeignKey(() => Department)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare departmentId: string | null;

    @BelongsTo(() => Department)
    declare department: Department;

    @Column({
        type: DataType.JSONB,
        allowNull: false,
        defaultValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    })
    declare monthlyAmounts: number[];

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare annualTotal: number;
}

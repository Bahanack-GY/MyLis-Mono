import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { BusinessExpense } from './business-expense.model';

@Table
export class BusinessExpenseType extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.STRING(7),
        allowNull: true,
    })
    declare color: string;

    @HasMany(() => BusinessExpense)
    declare businessExpenses: BusinessExpense[];
}

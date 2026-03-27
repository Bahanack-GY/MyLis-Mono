import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { User } from './user.model';
import { BusinessExpenseType } from './business-expense-type.model';
import { Expense } from './expense.model';

@Table({
    tableName: 'business_expenses',
    indexes: [
        { fields: ['employeeId'] },
        { fields: ['typeId'] },
        { fields: ['status'] },
        { fields: ['employeeId', 'status'] },
    ],
})
export class BusinessExpense extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare date: string;

    @Column(DataType.TEXT)
    declare description: string;

    @Column(DataType.STRING)
    declare receiptPath: string;

    @Column({
        type: DataType.ENUM('PENDING', 'VALIDATED', 'REJECTED'),
        defaultValue: 'PENDING',
    })
    declare status: string;

    @Column(DataType.TEXT)
    declare rejectionReason: string;

    @Column(DataType.DATE)
    declare validatedAt: Date;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare validatedById: string;

    @BelongsTo(() => User, 'validatedById')
    declare validatedBy: User;

    @ForeignKey(() => BusinessExpenseType)
    @Column({ type: DataType.UUID, allowNull: false })
    declare typeId: string;

    @BelongsTo(() => BusinessExpenseType)
    declare expenseType: BusinessExpenseType;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @ForeignKey(() => Expense)
    @Column({ type: DataType.UUID, allowNull: true })
    declare expenseId: string;

    @BelongsTo(() => Expense)
    declare expense: Expense;
}

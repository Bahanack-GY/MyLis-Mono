import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table({
    tableName: 'employee_monthly_rankings',
    indexes: [
        { fields: ['year', 'month', 'rank'], unique: true },
        { fields: ['employeeId'] },
        { fields: ['year'] },
    ],
})
export class EmployeeMonthlyRanking extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare year: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare month: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare rank: number;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare points: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare tasksCompleted: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare tasksReviewed: number;
}

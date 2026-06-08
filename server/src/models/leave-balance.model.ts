
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table
export class LeaveBalance extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee, 'employeeId')
    declare employee: Employee;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare year: number;

    @Column({ type: DataType.FLOAT, defaultValue: 18 })
    declare totalDays: number;

    @Column({ type: DataType.FLOAT, defaultValue: 0 })
    declare usedDays: number;
}

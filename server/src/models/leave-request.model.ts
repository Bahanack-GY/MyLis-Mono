
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { User } from './user.model';

@Table
export class LeaveRequest extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee, 'employeeId')
    declare employee: Employee;

    @Column({
        type: DataType.ENUM('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'),
        allowNull: false,
    })
    declare type: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare endDate: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare numberOfDays: number;

    @Column({ type: DataType.TEXT })
    declare reason: string;

    @Column({
        type: DataType.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING',
    })
    declare status: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare approvedById: string;

    @BelongsTo(() => User, 'approvedById')
    declare approvedBy: User;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare rejectionReason: string;

    @Column({ type: DataType.DATE, allowNull: true })
    declare approvedAt: Date;
}

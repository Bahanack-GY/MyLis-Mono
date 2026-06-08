
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { User } from './user.model';

@Table
export class PermissionRequest extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee, 'employeeId')
    declare employee: Employee;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare date: string;

    @Column({ type: DataType.STRING(5), allowNull: false })
    declare startTime: string;

    @Column({ type: DataType.STRING(5), allowNull: false })
    declare endTime: string;

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare durationHours: number;

    @Column({ type: DataType.TEXT, allowNull: false })
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

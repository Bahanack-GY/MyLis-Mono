import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { User } from './user.model';
import { Employee } from './employee.model';
import { Department } from './department.model';

@Table
export class Report extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare title: string;

    @Column({ type: DataType.ENUM('PERSONAL', 'DEPARTMENT', 'ACCOUNTING'), allowNull: false })
    declare type: string;

    @Column({ type: DataType.ENUM('GENERATING', 'COMPLETED', 'FAILED'), defaultValue: 'GENERATING' })
    declare status: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare generatedByUserId: string;

    @BelongsTo(() => User, 'generatedByUserId')
    declare generatedBy: User;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: true })
    declare targetEmployeeId: string | null;

    @BelongsTo(() => Employee, 'targetEmployeeId')
    declare targetEmployee: Employee;

    @ForeignKey(() => Department)
    @Column({ type: DataType.UUID, allowNull: true })
    declare targetDepartmentId: string | null;

    @BelongsTo(() => Department, 'targetDepartmentId')
    declare targetDepartment: Department;

    @Column({ type: DataType.ENUM('DAY', 'WEEK', 'MONTH', 'CUSTOM', 'QUARTER', 'SEMESTER', 'ANNUAL'), allowNull: false })
    declare period: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare endDate: string;

    @Column({ type: DataType.JSONB, allowNull: true })
    declare reportData: any;
}

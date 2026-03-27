import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Department } from './department.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
        { fields: ['fromDepartmentId'] },
        { fields: ['toDepartmentId'] },
    ],
})
export class EmployeeTransferHistory extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @ForeignKey(() => Department)
    @Column({ type: DataType.UUID, allowNull: true })
    declare fromDepartmentId: string | null;

    @BelongsTo(() => Department, 'fromDepartmentId')
    declare fromDepartment: Department;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare toDepartmentId: string;

    @BelongsTo(() => Department, 'toDepartmentId')
    declare toDepartment: Department;

    @Column({ type: DataType.UUID, allowNull: true })
    declare transferredByUserId: string | null;

    @Column(DataType.STRING)
    declare transferredByName: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare reason: string | null;

    @Column({ type: DataType.JSON, allowNull: true })
    declare metadata: Record<string, any> | null;
}

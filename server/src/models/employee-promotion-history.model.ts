import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
    ],
})
export class EmployeePromotionHistory extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @Column({ type: DataType.STRING, allowNull: true })
    declare fromRole: string | null;

    @Column(DataType.STRING)
    declare toRole: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare promotedByUserId: string | null;

    @Column(DataType.STRING)
    declare promotedByName: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare reason: string | null;
}

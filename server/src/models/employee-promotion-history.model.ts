import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Position } from './position.model';

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

    @ForeignKey(() => Position)
    @Column({ type: DataType.UUID, allowNull: true })
    declare fromPositionId: string | null;

    @BelongsTo(() => Position, 'fromPositionId')
    declare fromPosition: Position;

    @ForeignKey(() => Position)
    @Column(DataType.UUID)
    declare toPositionId: string;

    @BelongsTo(() => Position, 'toPositionId')
    declare toPosition: Position;

    @Column({ type: DataType.UUID, allowNull: true })
    declare promotedByUserId: string | null;

    @Column(DataType.STRING)
    declare promotedByName: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare reason: string | null;
}

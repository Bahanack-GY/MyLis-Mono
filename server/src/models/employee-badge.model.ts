
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
    ],
})
export class EmployeeBadge extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare badgeNumber: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare title: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare milestone: number;

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW,
    })
    declare earnedAt: Date;
}

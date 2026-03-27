import {
    Table, Column, Model, DataType,
    ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table({
    tableName: 'commercial_goals',
    indexes: [{ unique: true, fields: ['employeeId', 'year', 'month'] }],
})
export class CommercialGoal extends Model {
    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    /** Calendar year (e.g. 2026) */
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare year: number;

    /** Calendar month 1-12 */
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare month: number;

    /** Monthly revenue target in FCFA */
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare targetAmount: number;
}

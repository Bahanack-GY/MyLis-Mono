import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Department } from './department.model';

@Table({
    indexes: [
        {
            unique: true,
            fields: ['departmentId', 'year', 'month'],
        },
    ],
})
export class DepartmentMonthlyTarget extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Department)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare departmentId: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare year: number;

    /** 1 = January … 12 = December */
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare month: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare targetRevenue: number;

    @BelongsTo(() => Department)
    declare department: Department;
}

import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Department } from './department.model';

@Table
export class DepartmentService extends Model {
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
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.TEXT,
    })
    declare description: string;

    @Column({
        type: DataType.DECIMAL(15, 2),
    })
    declare price: number;

    @Column({
        type: DataType.STRING,
    })
    declare duration: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare isActive: boolean;

    @BelongsTo(() => Department)
    declare department: Department;
}

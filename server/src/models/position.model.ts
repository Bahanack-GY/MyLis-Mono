
import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Department } from './department.model';

@Table
export class Position extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare title: string;

    @Column(DataType.TEXT)
    declare description: string;

    @Column({
        type: DataType.JSON,
        defaultValue: [],
    })
    declare missions: string[];

    @ForeignKey(() => Department)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @HasMany(() => Employee)
    declare employees: Employee[];
}

import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Client } from './client.model';
import { Project } from './project.model';
import { DepartmentGoal } from './department-goal.model';
import { Position } from './position.model';

@Table
export class Department extends Model {
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
    declare name: string;

    @Column(DataType.TEXT)
    declare description: string;

    @ForeignKey(() => Employee)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare headId: string;

    @BelongsTo(() => Employee)
    declare head: Employee;

    @HasMany(() => Employee)
    declare employees: Employee[];

    @HasMany(() => Client)
    declare clients: Client[];

    @HasMany(() => Project)
    declare projects: Project[];

    @HasMany(() => DepartmentGoal)
    declare goals: DepartmentGoal[];

    @HasMany(() => Position)
    declare positions: Position[];
}

import { Table, Column, Model, DataType, BelongsTo, ForeignKey, BelongsToMany, HasMany } from 'sequelize-typescript';
import { Client } from './client.model';
import { Department } from './department.model';
import { Employee } from './employee.model';
import { ProjectMember } from './project-member.model';
import { Task } from './task.model';

@Table
export class Project extends Model {
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

    @Column(DataType.FLOAT)
    declare budget: number;

    @Column(DataType.FLOAT)
    declare revenue: number;

    @Column(DataType.DATE)
    declare startDate: Date;

    @Column(DataType.DATE)
    declare endDate: Date;

    @ForeignKey(() => Client)
    @Column(DataType.UUID)
    declare clientId: string;

    @BelongsTo(() => Client)
    declare client: Client;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @BelongsToMany(() => Employee, () => ProjectMember)
    declare members: Employee[];

    @HasMany(() => Task)
    declare tasks: Task[];
}

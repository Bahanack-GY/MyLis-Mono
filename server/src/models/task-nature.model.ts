import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Task } from './task.model';

@Table
export class TaskNature extends Model {
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

    @Column({
        type: DataType.STRING(7),
        allowNull: true,
    })
    declare color: string;

    @HasMany(() => Task)
    declare tasks: Task[];
}

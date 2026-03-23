import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Task } from './task.model';

@Table({
    indexes: [
        { fields: ['taskId'] },
        { fields: ['taskId', 'completed'] },
    ],
})
export class Subtask extends Model {
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

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare completed: boolean;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare order: number;

    @ForeignKey(() => Task)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare taskId: string;

    @BelongsTo(() => Task)
    declare task: Task;

    @Column({ type: DataType.DATE, allowNull: true })
    declare completedAt: Date | null;
}

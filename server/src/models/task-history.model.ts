import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Task } from './task.model';

@Table({
    indexes: [
        { fields: ['taskId'] },
    ],
})
export class TaskHistory extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Task)
    @Column(DataType.UUID)
    declare taskId: string;

    @BelongsTo(() => Task)
    declare task: Task;

    @Column({ type: DataType.UUID, allowNull: true })
    declare changedByUserId: string | null;

    @Column(DataType.STRING)
    declare changedByName: string;

    @Column(DataType.JSON)
    declare changes: Record<string, { from: any; to: any }>;
}

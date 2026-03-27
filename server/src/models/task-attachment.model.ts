
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Task } from './task.model';

@Table({ tableName: 'task_attachments' })
export class TaskAttachment extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Task)
    @Column({ type: DataType.UUID, allowNull: false })
    declare taskId: string;

    @BelongsTo(() => Task)
    declare task: Task;

    @Column({ type: DataType.STRING, allowNull: false })
    declare fileName: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare filePath: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare fileType: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare size: number;

    @Column({ type: DataType.UUID, allowNull: true })
    declare uploadedByUserId: string;
}

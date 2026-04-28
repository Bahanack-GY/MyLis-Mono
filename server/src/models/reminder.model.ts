import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'reminders' })
export class Reminder extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare userId: string;

    @BelongsTo(() => User)
    declare user: User;

    @Column({ type: DataType.STRING, allowNull: false })
    declare title: string;

    @Column(DataType.TEXT)
    declare description: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare dueDate: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare isCompleted: boolean;

    @Column({ type: DataType.DATE, allowNull: true, defaultValue: null })
    declare completedAt: Date | null;
}

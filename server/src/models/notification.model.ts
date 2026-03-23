
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
    indexes: [
        { fields: ['userId'] },
        { fields: ['userId', 'read'] },
        { fields: ['userId', 'createdAt'] },
    ],
})
export class Notification extends Model {
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
    declare body: string;

    @Column({
        type: DataType.ENUM('system', 'task', 'project', 'meeting', 'document', 'ticket', 'sanction', 'chat', 'demand', 'message'),
        defaultValue: 'system',
    })
    declare type: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare read: boolean;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare meta: Record<string, unknown> | null;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare userId: string;

    @BelongsTo(() => User)
    declare user: User;
}

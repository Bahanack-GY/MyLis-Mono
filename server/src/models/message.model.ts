import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Channel } from './channel.model';
import { User } from './user.model';

@Table({
    indexes: [
        { fields: ['channelId'] },
        { fields: ['channelId', 'createdAt'] },
        { fields: ['senderId'] },
    ],
})
export class Message extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Channel)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare channelId: string;

    @BelongsTo(() => Channel)
    declare channel: Channel;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare senderId: string;

    @BelongsTo(() => User)
    declare sender: User;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        defaultValue: '',
    })
    declare content: string;

    @ForeignKey(() => Message)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare replyToId: string | null;

    @BelongsTo(() => Message, 'replyToId')
    declare replyTo: Message;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        defaultValue: null,
    })
    declare mentions: string[] | null;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        defaultValue: null,
    })
    declare attachments: {
        fileName: string;
        filePath: string;
        fileType: string;
        size: number;
    }[] | null;
}

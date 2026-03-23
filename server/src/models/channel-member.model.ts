import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Channel } from './channel.model';
import { User } from './user.model';

@Table({
    indexes: [
        { unique: true, fields: ['channelId', 'userId'] },
    ],
})
export class ChannelMember extends Model {
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
    declare userId: string;

    @BelongsTo(() => User)
    declare user: User;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare lastReadAt: Date;
}

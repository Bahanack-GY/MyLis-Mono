import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Department } from './department.model';
import { User } from './user.model';
import { Message } from './message.model';
import { ChannelMember } from './channel-member.model';

@Table
export class Channel extends Model {
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
        type: DataType.ENUM('GENERAL', 'DEPARTMENT', 'DIRECT', 'MANAGERS'),
        allowNull: false,
    })
    declare type: string;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare createdById: string;

    @BelongsTo(() => User)
    declare createdBy: User;

    @Column(DataType.TEXT)
    declare description: string;

    @HasMany(() => Message)
    declare messages: Message[];

    @HasMany(() => ChannelMember)
    declare members: ChannelMember[];
}

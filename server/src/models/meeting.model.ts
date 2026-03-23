
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript';
import { User } from './user.model';
import { Employee } from './employee.model';
import { MeetingParticipant } from './meeting-participant.model';

@Table
export class Meeting extends Model {
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
    declare description: string;

    @Column({
        type: DataType.ENUM('standup', 'review', 'planning', 'retrospective', 'client', 'onboarding'),
        defaultValue: 'standup',
    })
    declare type: string;

    @Column({
        type: DataType.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'scheduled',
    })
    declare status: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare date: string;

    @Column(DataType.STRING)
    declare startTime: string;

    @Column(DataType.STRING)
    declare endTime: string;

    @Column(DataType.STRING)
    declare location: string;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare organizerId: string;

    @BelongsTo(() => User)
    declare organizer: User;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    declare report: {
        summary: string;
        decisions: string[];
        actionItems: { task: string; assignee: string }[];
    } | null;

    @BelongsToMany(() => Employee, () => MeetingParticipant)
    declare participants: Employee[];
}

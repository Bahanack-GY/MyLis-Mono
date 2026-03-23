
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Team } from './team.model';
import { Project } from './project.model';

@Table({
    indexes: [
        { fields: ['assignedToId'] },
        { fields: ['assignedToId', 'state'] },
        { fields: ['assignedToId', 'state', 'completedAt'] },
        { fields: ['projectId'] },
        { fields: ['ticketId'] },
        { fields: ['state'] },
    ],
})
export class Task extends Model {
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
        type: DataType.ENUM('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'REVIEWED'),
        defaultValue: 'CREATED',
    })
    declare state: string;

    @Column({
        type: DataType.ENUM('EASY', 'MEDIUM', 'HARD'),
        defaultValue: 'MEDIUM',
    })
    declare difficulty: string;

    @Column(DataType.DATE)
    declare startDate: Date;

    @Column(DataType.DATE)
    declare endDate: Date;

    @Column(DataType.DATE)
    declare dueDate: Date;

    @Column(DataType.TIME)
    declare startTime: string;

    @Column(DataType.TIME)
    declare endTime: string;

    @Column(DataType.TEXT)
    declare blockReason: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare assignedToId: string;

    @BelongsTo(() => Employee, 'assignedToId')
    declare assignedTo: Employee;

    @ForeignKey(() => Team)
    @Column(DataType.UUID)
    declare assignedToTeamId: string;

    @BelongsTo(() => Team)
    declare assignedToTeam: Team;

    @ForeignKey(() => Project)
    @Column(DataType.UUID)
    declare projectId: string;

    @BelongsTo(() => Project)
    declare project: Project;

    @Column({ type: DataType.UUID, allowNull: true })
    declare ticketId: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare selfAssigned: boolean;

    @Column({ type: DataType.UUID, allowNull: true })
    declare createdByUserId: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare startedAt: Date | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare completedAt: Date | null;
}

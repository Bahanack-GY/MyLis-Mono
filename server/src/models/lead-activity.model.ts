import {
    Table, Column, Model, DataType,
    ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Lead } from './lead.model';
import { Employee } from './employee.model';
import { Client } from './client.model';

export enum ActivityType {
    VISITE_CLIENT = 'VISITE_CLIENT',
    VISITE_PROSPECT = 'VISITE_PROSPECT',
    APPEL = 'APPEL',
    EMAIL = 'EMAIL',
    REUNION = 'REUNION',
    DEMO = 'DEMO',
    RELANCE = 'RELANCE',
    AUTRE = 'AUTRE',
}

export enum ActivityStatus {
    PLANNED = 'PLANNED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

@Table({
    tableName: 'lead_activities',
    indexes: [
        { fields: ['leadId'] },
        { fields: ['clientId'] },
        { fields: ['employeeId'] },
        { fields: ['type'] },
        { fields: ['date'] },
        { fields: ['activityStatus'] },
    ],
})
export class LeadActivity extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Lead)
    @Column({
        type: DataType.UUID,
        allowNull: true, // Now nullable - either leadId OR clientId must be provided
    })
    declare leadId: string | null;

    @BelongsTo(() => Lead)
    declare lead: Lead;

    @ForeignKey(() => Client)
    @Column({
        type: DataType.UUID,
        allowNull: true, // Nullable - activities can be for Lead OR Client
    })
    declare clientId: string | null;

    @BelongsTo(() => Client)
    declare client: Client;

    @ForeignKey(() => Employee)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @Column({
        type: DataType.ENUM(...Object.values(ActivityType)),
        allowNull: false,
    })
    declare type: ActivityType;

    @Column({
        type: DataType.ENUM(...Object.values(ActivityStatus)),
        allowNull: false,
        defaultValue: ActivityStatus.PLANNED,
    })
    declare activityStatus: ActivityStatus;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare date: string;

    @Column(DataType.STRING)
    declare startTime: string;

    @Column(DataType.STRING)
    declare endTime: string;

    @Column(DataType.TEXT)
    declare description: string;

    @Column(DataType.TEXT)
    declare result: string;

    @Column(DataType.TEXT)
    declare nextAction: string;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
    })
    declare cost: number;

    @Column(DataType.STRING)
    declare location: string;
}

import {
    Table, Column, Model, DataType,
    ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Client } from './client.model';
import { LeadActivity } from './lead-activity.model';
import { Task } from './task.model';

export enum SaleStage {
    PROSPECTION = 'PROSPECTION',
    QUALIFICATION = 'QUALIFICATION',
    PROPOSITION = 'PROPOSITION',
    NEGOCIATION = 'NEGOCIATION',
    CLOSING = 'CLOSING',
    GAGNE = 'GAGNE',
    PERDU = 'PERDU',
}

export enum LeadType {
    PROSPECT = 'PROSPECT',
    CLIENT_EXISTANT = 'CLIENT_EXISTANT',
    RECOMMANDATION = 'RECOMMANDATION',
    APPEL_ENTRANT = 'APPEL_ENTRANT',
    SALON = 'SALON',
    SITE_WEB = 'SITE_WEB',
    RESEAU_SOCIAL = 'RESEAU_SOCIAL',
    PARTENAIRE = 'PARTENAIRE',
}

export enum LeadStatus {
    NOUVEAU = 'NOUVEAU',
    CONTACTE = 'CONTACTE',
    QUALIFIE = 'QUALIFIE',
    PROPOSITION_ENVOYEE = 'PROPOSITION_ENVOYEE',
    NEGOCIATION = 'NEGOCIATION',
    GAGNE = 'GAGNE',
    PERDU = 'PERDU',
    EN_ATTENTE = 'EN_ATTENTE',
}

export enum LeadPriority {
    HOT = 'HOT',
    WARM = 'WARM',
    COLD = 'COLD',
}

@Table({
    tableName: 'leads',
    indexes: [
        { unique: true, fields: ['code'] },
        { fields: ['assignedToId'] },
        { fields: ['saleStage'] },
        { fields: ['leadStatus'] },
        { fields: ['clientId'] },
        { fields: ['priority'] },
        { fields: ['leadType'] },
        { fields: ['nextActionDeadline'] },
    ],
})
export class Lead extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare code: string;

    // ── Company Info ──
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare company: string;

    @Column(DataType.STRING)
    declare activitySector: string;

    @Column(DataType.TEXT)
    declare clientNeeds: string;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
    })
    declare potentialRevenue: number;

    @Column(DataType.STRING)
    declare source: string;

    // ── Location ──
    @Column(DataType.STRING)
    declare country: string;

    @Column(DataType.STRING)
    declare region: string;

    @Column(DataType.STRING)
    declare city: string;

    @Column(DataType.STRING)
    declare commune: string;

    @Column(DataType.STRING)
    declare postalCode: string;

    @Column(DataType.TEXT)
    declare address: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare paymentDelay: number;

    // ── Contact 1 ──
    @Column(DataType.STRING)
    declare contact1Name: string;

    @Column(DataType.STRING)
    declare contact1Role: string;

    @Column(DataType.STRING)
    declare contact1Email: string;

    @Column(DataType.STRING)
    declare contact1Phone: string;

    // ── Contact 2 ──
    @Column(DataType.STRING)
    declare contact2Name: string;

    @Column(DataType.STRING)
    declare contact2Role: string;

    @Column(DataType.STRING)
    declare contact2Email: string;

    @Column(DataType.STRING)
    declare contact2Phone: string;

    // ── Sales Pipeline ──
    @ForeignKey(() => Employee)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare assignedToId: string | null;

    @BelongsTo(() => Employee)
    declare assignedTo: Employee;

    @Column(DataType.STRING)
    declare competitor: string;

    @Column(DataType.TEXT)
    declare competitorOffer: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: 0,
    })
    declare successRate: number;

    @Column({
        type: DataType.ENUM(...Object.values(LeadPriority)),
        allowNull: true,
        defaultValue: LeadPriority.COLD,
    })
    declare priority: LeadPriority;

    @Column({
        type: DataType.ENUM(...Object.values(SaleStage)),
        allowNull: false,
        defaultValue: SaleStage.PROSPECTION,
    })
    declare saleStage: SaleStage;

    @Column({
        type: DataType.ENUM(...Object.values(LeadType)),
        allowNull: false,
        defaultValue: LeadType.PROSPECT,
    })
    declare leadType: LeadType;

    @Column({
        type: DataType.ENUM(...Object.values(LeadStatus)),
        allowNull: false,
        defaultValue: LeadStatus.NOUVEAU,
    })
    declare leadStatus: LeadStatus;

    @Column(DataType.TEXT)
    declare lossReason: string;

    @Column(DataType.TEXT)
    declare lastAction: string;

    @Column(DataType.DATEONLY)
    declare lastActionDate: string;

    @Column(DataType.TEXT)
    declare lastActionResult: string;

    @Column(DataType.TEXT)
    declare nextAction: string;

    @Column(DataType.DATEONLY)
    declare nextActionDeadline: string;

    @Column(DataType.TEXT)
    declare comment: string;

    // ── Conversion ──
    @ForeignKey(() => Client)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare clientId: string | null;

    @BelongsTo(() => Client)
    declare client: Client;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare convertedAt: Date | null;

    // ── Associations ──
    @HasMany(() => LeadActivity)
    declare activities: LeadActivity[];

    @HasMany(() => Task)
    declare tasks: Task[];
}

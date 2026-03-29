import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Lead } from './lead.model';

@Table({ tableName: 'lead_contacts' })
export class LeadContact extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Lead)
    @Column({ type: DataType.UUID, allowNull: false })
    declare leadId: string;

    @BelongsTo(() => Lead)
    declare lead: Lead;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column(DataType.STRING)
    declare role: string;

    @Column(DataType.STRING)
    declare email: string;

    @Column(DataType.STRING)
    declare phone: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare isPrimary: boolean;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare order: number;
}

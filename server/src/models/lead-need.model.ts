import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Lead } from './lead.model';
import { DepartmentService } from './department-service.model';

@Table({ tableName: 'lead_needs' })
export class LeadNeed extends Model {
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

    @Column({ type: DataType.TEXT, allowNull: false })
    declare description: string;

    @ForeignKey(() => DepartmentService)
    @Column({ type: DataType.UUID, allowNull: true })
    declare serviceId: string | null;

    @BelongsTo(() => DepartmentService)
    declare service: DepartmentService;
}

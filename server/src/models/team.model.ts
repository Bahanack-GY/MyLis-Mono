
import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table
export class Team extends Model {
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

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare leadId: string;

    @BelongsTo(() => Employee, 'leadId')
    declare lead: Employee;

    @HasMany(() => Employee, 'teamId')
    declare members: Employee[];
}

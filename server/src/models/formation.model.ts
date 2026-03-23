
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
    ],
})
export class Formation extends Model {
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

    @Column(DataType.STRING)
    declare organization: string;

    @Column(DataType.DATE)
    declare startDate: Date;

    @Column(DataType.DATE)
    declare endDate: Date;

    @Column(DataType.STRING)
    declare certificateDetails: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;
}

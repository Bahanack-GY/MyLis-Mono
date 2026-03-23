
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { User } from './user.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
        { fields: ['employeeId', 'type'] },
    ],
})
export class Sanction extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.ENUM('AVERTISSEMENT', 'BLAME', 'MISE_A_PIED', 'LICENCIEMENT'),
        allowNull: false,
    })
    declare type: string;

    @Column(DataType.STRING)
    declare title: string;

    @Column(DataType.TEXT)
    declare reason: string;

    @Column({
        type: DataType.ENUM('LEGER', 'MOYEN', 'GRAVE'),
        defaultValue: 'LEGER',
    })
    declare severity: string;

    @Column(DataType.DATE)
    declare date: Date;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare issuedByUserId: string;

    @BelongsTo(() => User)
    declare issuedBy: User;
}

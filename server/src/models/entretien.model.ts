
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { User } from './user.model';

@Table
export class Entretien extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.ENUM('ANNUEL', 'PROFESSIONNEL', 'EVALUATION', 'DISCIPLINAIRE'),
        allowNull: false,
    })
    declare type: string;

    @Column(DataType.STRING)
    declare title: string;

    @Column(DataType.DATE)
    declare date: Date;

    @Column({
        type: DataType.ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'SCHEDULED',
    })
    declare status: string;

    @Column(DataType.TEXT)
    declare notes: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare conductedByUserId: string;

    @BelongsTo(() => User)
    declare conductedBy: User;
}

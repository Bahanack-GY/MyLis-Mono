
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Department } from './department.model';
import { Employee } from './employee.model';

@Table({
    indexes: [
        { fields: ['status'] },
        { fields: ['targetDepartmentId'] },
        { fields: ['createdById'] },
        { fields: ['assignedToId'] },
    ],
})
export class Ticket extends Model {
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
        type: DataType.ENUM('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'),
        defaultValue: 'OPEN',
    })
    declare status: string;

    @Column({
        type: DataType.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
        defaultValue: 'MEDIUM',
    })
    declare priority: string;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare createdById: string;

    @BelongsTo(() => User)
    declare createdBy: User;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare targetDepartmentId: string;

    @BelongsTo(() => Department)
    declare targetDepartment: Department;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare assignedToId: string;

    @BelongsTo(() => Employee)
    declare assignedTo: Employee;

    @Column(DataType.DATE)
    declare dueDate: Date;

    @Column(DataType.DATE)
    declare closedAt: Date;
}


import { Table, Column, Model, DataType, HasOne } from 'sequelize-typescript';
import { Employee } from './employee.model';

@Table
export class User extends Model {
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
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare passwordHash: string;

    @Column({
        type: DataType.ENUM('MANAGER', 'EMPLOYEE', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'),
        defaultValue: 'EMPLOYEE',
    })
    declare role: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare firstLogin: boolean;

    @HasOne(() => Employee)
    declare employee: Employee;
}


import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Employee } from './employee.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
        { fields: ['employeeId', 'category'] },
    ],
})
export class Document extends Model {
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

    @Column(DataType.TEXT)
    declare description: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare filePath: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare fileType: string;

    @Column({
        type: DataType.ENUM('CONTRACT', 'ID', 'DIPLOMA', 'OTHER'),
        defaultValue: 'OTHER',
    })
    declare category: string;

    @Column({
        type: DataType.ENUM('EVERYONE', 'DEPARTMENTS', 'EMPLOYEES', 'MANAGERS_ONLY'),
        defaultValue: 'EVERYONE',
        allowNull: false,
    })
    declare visibilityType: string;

    @Column({
        type: DataType.ARRAY(DataType.UUID),
        defaultValue: [],
    })
    declare allowedDepartmentIds: string[];

    @Column({
        type: DataType.ARRAY(DataType.UUID),
        defaultValue: [],
    })
    declare allowedEmployeeIds: string[];

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare uploadedById: string;

    @BelongsTo(() => User)
    declare uploadedBy: User;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;
}

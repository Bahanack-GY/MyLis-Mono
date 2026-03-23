
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Employee } from './employee.model';
import { Department } from './department.model';
import { DemandItem } from './demand-item.model';

@Table({
    indexes: [
        { fields: ['employeeId'] },
        { fields: ['departmentId'] },
        { fields: ['status'] },
        { fields: ['departmentId', 'status'] },
    ],
})
export class Demand extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalPrice: number;

    @Column(DataType.STRING)
    declare proformaUrl: string;

    @Column({
        type: DataType.ENUM('BARELY', 'IMPORTANT', 'VERY_IMPORTANT', 'URGENT'),
        defaultValue: 'IMPORTANT',
    })
    declare importance: string;

    @Column({
        type: DataType.ENUM('PENDING', 'VALIDATED', 'REJECTED'),
        defaultValue: 'PENDING',
    })
    declare status: string;

    @Column(DataType.TEXT)
    declare rejectionReason: string;

    @Column(DataType.DATE)
    declare validatedAt: Date;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @HasMany(() => DemandItem)
    declare items: DemandItem[];
}

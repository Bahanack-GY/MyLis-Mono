import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Department } from './department.model';

@Table
export class InvoiceTemplate extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Department)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        unique: true,
    })
    declare departmentId: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare companyName: string;

    @Column(DataType.STRING)
    declare logoUrl: string;

    @Column(DataType.TEXT)
    declare address: string;

    @Column(DataType.STRING)
    declare phone: string;

    @Column(DataType.STRING)
    declare email: string;

    @Column(DataType.TEXT)
    declare paymentTerms: string;

    @Column(DataType.TEXT)
    declare footerText: string;

    @Column(DataType.TEXT)
    declare bankInfo: string;

    @BelongsTo(() => Department)
    declare department: Department;
}

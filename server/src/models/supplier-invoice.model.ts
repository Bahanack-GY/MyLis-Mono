import { Column, DataType, Model, Table, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Supplier } from './supplier.model';
import { Department } from './department.model';
import { User } from './user.model';
import { SupplierInvoiceItem } from './supplier-invoice-item.model';

@Table({
    tableName: 'supplier_invoices',
    indexes: [
        { fields: ['supplierId'] },
        { fields: ['status'] },
        { fields: ['date'] },
        { fields: ['dueDate'] },
        { fields: ['departmentId'] },
    ],
})
export class SupplierInvoice extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare invoiceNumber: string;

    @ForeignKey(() => Supplier)
    @Column({ type: DataType.UUID, allowNull: false })
    declare supplierId: string;

    @BelongsTo(() => Supplier)
    declare supplier: Supplier;

    @ForeignKey(() => Department)
    @Column({ type: DataType.UUID, allowNull: true })
    declare departmentId: string | null;

    @BelongsTo(() => Department)
    declare department: Department;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare createdByUserId: string | null;

    @BelongsTo(() => User)
    declare createdBy: User;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare date: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare dueDate: string;

    @Column({
        type: DataType.ENUM('DRAFT', 'VALIDATED', 'PAID', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
    })
    declare status: 'DRAFT' | 'VALIDATED' | 'PAID' | 'CANCELLED';

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare totalHT: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare taxAmount: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare totalTTC: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notes: string | null;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    declare paidAt: string | null;

    @HasMany(() => SupplierInvoiceItem)
    declare items: SupplierInvoiceItem[];
}

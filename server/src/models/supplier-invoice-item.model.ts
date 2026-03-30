import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { SupplierInvoice } from './supplier-invoice.model';

@Table({ tableName: 'supplier_invoice_items' })
export class SupplierInvoiceItem extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => SupplierInvoice)
    @Column({ type: DataType.UUID, allowNull: false })
    declare supplierInvoiceId: string;

    @BelongsTo(() => SupplierInvoice)
    declare supplierInvoice: SupplierInvoice;

    @Column({ type: DataType.STRING, allowNull: false })
    declare description: string;

    @Column({ type: DataType.DECIMAL(10, 3), allowNull: false, defaultValue: 1 })
    declare quantity: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare unitPrice: number;

    @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 0 })
    declare taxRate: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare totalHT: number;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare totalTTC: number;
}

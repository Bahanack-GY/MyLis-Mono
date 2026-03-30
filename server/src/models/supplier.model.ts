import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { SupplierInvoice } from './supplier-invoice.model';

@Table({
    tableName: 'suppliers',
    indexes: [
        { fields: ['isActive'] },
        { fields: ['name'] },
    ],
})
export class Supplier extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare email: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare phone: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare address: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare rccm: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare niu: string | null;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 30 })
    declare paymentTermsDays: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notes: string | null;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    declare isActive: boolean;

    @HasMany(() => SupplierInvoice)
    declare invoices: SupplierInvoice[];
}

import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Invoice } from './invoice.model';

@Table
export class InvoiceItem extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Invoice)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare invoiceId: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare description: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare quantity: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare unitPrice: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare metadata: Record<string, string> | null;

    @BelongsTo(() => Invoice)
    declare invoice: Invoice;
}

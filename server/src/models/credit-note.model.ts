import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Invoice } from './invoice.model';
import { User } from './user.model';

@Table({
    tableName: 'credit_notes',
    indexes: [
        { fields: ['creditNoteNumber'], unique: true },
        { fields: ['invoiceId'] },
    ],
})
export class CreditNote extends Model {
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
    declare creditNoteNumber: string;

    @ForeignKey(() => Invoice)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare invoiceId: string;

    @BelongsTo(() => Invoice)
    declare invoice: Invoice;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    declare reason: string;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare taxAmount: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare total: number;

    @Column({
        type: DataType.ENUM('DRAFT', 'VALIDATED'),
        allowNull: false,
        defaultValue: 'DRAFT',
    })
    declare status: 'DRAFT' | 'VALIDATED';

    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare createdByUserId: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare validatedAt: Date | null;
}

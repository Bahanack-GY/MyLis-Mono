import {
    Table, Column, Model, DataType,
    ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { Invoice } from './invoice.model';
import { Client } from './client.model';
import { User } from './user.model';

export enum PaymentMethod {
    CHEQUE = 'CHEQUE',
    VIREMENT = 'VIREMENT',
    ESPECES = 'ESPECES',
    MOBILE_MONEY = 'MOBILE_MONEY',
    CARTE = 'CARTE',
    AUTRE = 'AUTRE',
}

@Table({
    tableName: 'client_payments',
    indexes: [
        { fields: ['invoiceId'] },
        { fields: ['clientId'] },
        { fields: ['date'] },
    ],
})
export class ClientPayment extends Model {
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

    @BelongsTo(() => Invoice)
    declare invoice: Invoice;

    @ForeignKey(() => Client)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare clientId: string;

    @BelongsTo(() => Client)
    declare client: Client;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare date: string;

    @Column(DataType.STRING)
    declare reference: string;

    @Column({
        type: DataType.ENUM(...Object.values(PaymentMethod)),
        allowNull: false,
        defaultValue: PaymentMethod.VIREMENT,
    })
    declare method: PaymentMethod;

    @Column(DataType.TEXT)
    declare notes: string;

    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare createdByUserId: string;

    @BelongsTo(() => User, 'createdByUserId')
    declare createdBy: User;
}

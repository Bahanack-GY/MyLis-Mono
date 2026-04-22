import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Project } from './project.model';
import { Department } from './department.model';
import { Client } from './client.model';
import { User } from './user.model';
import { InvoiceItem } from './invoice-item.model';

@Table({
    indexes: [
        { fields: ['status'] },
        { fields: ['departmentId'] },
        { fields: ['departmentId', 'status'] },
        { fields: ['clientId'] },
        { fields: ['invoiceNumber'] },
    ],
})
export class Invoice extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        unique: true,
    })
    declare invoiceNumber: string | null;

    @Column({
        type: DataType.STRING(20),
        allowNull: true,
        unique: true,
    })
    declare proformaNumber: string | null;

    @Column({
        type: DataType.STRING(20),
        allowNull: false,
        defaultValue: 'INVOICE',
    })
    declare type: 'PROFORMA' | 'INVOICE' | 'ACOMPTE';

    @Column({
        type: DataType.STRING(20),
        allowNull: true,
        unique: true,
    })
    declare acompteNumber: string | null;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: true,
    })
    declare acompteAmount: number | null;

    @ForeignKey(() => Invoice)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare parentInvoiceId: string | null;

    @BelongsTo(() => Invoice, 'parentInvoiceId')
    declare parentInvoice: Invoice;

    @Column({
        type: DataType.ENUM('CREATED', 'SENT', 'PAID', 'REJECTED'),
        defaultValue: 'CREATED',
    })
    declare status: string;

    @ForeignKey(() => Project)
    @Column(DataType.UUID)
    declare projectId: string;

    @BelongsTo(() => Project)
    declare project: Project;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @ForeignKey(() => Client)
    @Column(DataType.UUID)
    declare clientId: string;

    @BelongsTo(() => Client)
    declare client: Client;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    declare createdById: string;

    @BelongsTo(() => User)
    declare createdBy: User;

    @Column(DataType.DATE)
    declare issueDate: Date;

    @Column(DataType.DATE)
    declare dueDate: Date;

    @Column({
        type: DataType.DECIMAL(15, 2),
        defaultValue: 0,
    })
    declare subtotal: number;

    @Column({
        type: DataType.DECIMAL(5, 2),
        defaultValue: 0,
    })
    declare taxRate: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        defaultValue: 0,
    })
    declare taxAmount: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        defaultValue: 0,
    })
    declare total: number;

    @Column(DataType.TEXT)
    declare notes: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare customColumns: { id: string; label: string }[] | null;

    @Column(DataType.DATE)
    declare paidAt: Date;

    @Column(DataType.DATE)
    declare sentAt: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare lastReminderSentAt: Date | null;

    @HasMany(() => InvoiceItem)
    declare items: InvoiceItem[];
}

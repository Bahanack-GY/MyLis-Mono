import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { JournalEntry } from './journal-entry.model';
import { Account } from './account.model';

@Table({
    tableName: 'journal_entry_lines',
    indexes: [
        { fields: ['journalEntryId'] },
        { fields: ['accountId'] },
        { fields: ['accountId', 'journalEntryId'] },
    ],
})
export class JournalEntryLine extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => JournalEntry)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare journalEntryId: string;

    @BelongsTo(() => JournalEntry)
    declare journalEntry: JournalEntry;

    @ForeignKey(() => Account)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare accountId: string;

    @BelongsTo(() => Account)
    declare account: Account;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare debit: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare credit: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare label: string | null;
}

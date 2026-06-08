import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { JournalEntry } from './journal-entry.model';
import { Account } from './account.model';
import { Department } from './department.model';

@Table({
    tableName: 'journal_entry_lines',
    indexes: [
        { fields: ['journalEntryId'] },
        { fields: ['accountId'] },
        { fields: ['accountId', 'journalEntryId'] },
        { fields: ['auxiliaryAccountId'] },
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

    @BelongsTo(() => Account, { foreignKey: 'accountId', as: 'account' })
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

    // Auxiliary (nominative) account — null for non-tier accounts.
    // accountId = collective (411000, 401000, 421000…), auxiliaryAccountId = the specific tier sub-account.
    @ForeignKey(() => Account)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare auxiliaryAccountId: string | null;

    @BelongsTo(() => Account, { foreignKey: 'auxiliaryAccountId', as: 'auxiliaryAccount' })
    declare auxiliaryAccount: Account;

    @ForeignKey(() => Department)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare departmentId: string | null;

    @BelongsTo(() => Department)
    declare department: Department;
}

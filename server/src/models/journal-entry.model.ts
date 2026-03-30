import { Column, DataType, Model, Table, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Journal } from './journal.model';
import { FiscalYear } from './fiscal-year.model';
import { User } from './user.model';
import { JournalEntryLine } from './journal-entry-line.model';

@Table({
    tableName: 'journal_entries',
    indexes: [
        { fields: ['entryNumber'], unique: true },
        { fields: ['journalId'] },
        { fields: ['fiscalYearId'] },
        { fields: ['date'] },
        { fields: ['sourceType', 'sourceId'] },
        { fields: ['status'] },
    ],
})
export class JournalEntry extends Model {
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
    declare entryNumber: string;

    @ForeignKey(() => Journal)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare journalId: string;

    @BelongsTo(() => Journal)
    declare journal: Journal;

    @ForeignKey(() => FiscalYear)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare fiscalYearId: string;

    @BelongsTo(() => FiscalYear)
    declare fiscalYear: FiscalYear;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare date: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare description: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare reference: string | null;

    @Column({
        type: DataType.ENUM('MANUAL', 'INVOICE', 'EXPENSE', 'SALARY', 'TAX', 'CREDIT_NOTE', 'SUPPLIER_INVOICE'),
        allowNull: false,
        defaultValue: 'MANUAL',
    })
    declare sourceType: 'MANUAL' | 'INVOICE' | 'EXPENSE' | 'SALARY' | 'TAX' | 'CREDIT_NOTE' | 'SUPPLIER_INVOICE';

    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare sourceId: string | null;

    @Column({
        type: DataType.ENUM('DRAFT', 'VALIDATED'),
        allowNull: false,
        defaultValue: 'DRAFT',
    })
    declare status: 'DRAFT' | 'VALIDATED';

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare validatedAt: Date | null;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'validatedByUserId',
    })
    declare validatedByUserId: string | null;

    @BelongsTo(() => User, 'validatedByUserId')
    declare validatedBy: User;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare createdByUserId: string;

    @BelongsTo(() => User, 'createdByUserId')
    declare createdBy: User;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalDebit: number;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare totalCredit: number;

    @HasMany(() => JournalEntryLine)
    declare lines: JournalEntryLine[];
}

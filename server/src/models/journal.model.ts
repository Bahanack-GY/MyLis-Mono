import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { JournalEntry } from './journal-entry.model';

@Table({
    tableName: 'journals',
})
export class Journal extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING(5),
        allowNull: false,
        unique: true,
    })
    declare code: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.ENUM('PURCHASES', 'SALES', 'BANK', 'CASH', 'MISCELLANEOUS'),
        allowNull: false,
    })
    declare type: 'PURCHASES' | 'SALES' | 'BANK' | 'CASH' | 'MISCELLANEOUS';

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare isActive: boolean;

    @HasMany(() => JournalEntry)
    declare entries: JournalEntry[];
}

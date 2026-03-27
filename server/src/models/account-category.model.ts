import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { Account } from './account.model';

@Table({
    tableName: 'account_categories',
})
export class AccountCategory extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING(1),
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
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string | null;

    @HasMany(() => Account)
    declare accounts: Account[];
}

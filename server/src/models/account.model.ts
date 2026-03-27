import { Column, DataType, Model, Table, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { AccountCategory } from './account-category.model';

@Table({
    tableName: 'accounts',
    indexes: [
        { fields: ['code'], unique: true },
        { fields: ['categoryId'] },
        { fields: ['type'] },
        { fields: ['parentId'] },
    ],
})
export class Account extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING(10),
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
        type: DataType.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
        allowNull: false,
    })
    declare type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

    @ForeignKey(() => AccountCategory)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare categoryId: string;

    @BelongsTo(() => AccountCategory)
    declare category: AccountCategory;

    @ForeignKey(() => Account)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare parentId: string | null;

    @BelongsTo(() => Account, 'parentId')
    declare parent: Account;

    @HasMany(() => Account, 'parentId')
    declare children: Account[];

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare isSystem: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare isActive: boolean;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string | null;
}

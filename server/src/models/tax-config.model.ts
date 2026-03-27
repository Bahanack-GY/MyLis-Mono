import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'tax_configs',
    indexes: [
        { fields: ['key'], unique: true },
    ],
})
export class TaxConfig extends Model {
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
    declare key: string;

    @Column({
        type: DataType.DECIMAL(10, 4),
        allowNull: false,
    })
    declare value: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare label: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string | null;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare effectiveFrom: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare effectiveTo: string | null;
}

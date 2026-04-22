import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'charge_nature_configs',
    indexes: [
        { fields: ['chargeFamily'] },
        { fields: ['chargeFamily', 'natureName'], unique: true },
    ],
})
export class ChargeNatureConfig extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    declare chargeFamily: string;

    @Column({
        type: DataType.STRING(200),
        allowNull: false,
    })
    declare natureName: string;

    @Column({
        type: DataType.STRING(10),
        allowNull: false,
    })
    declare syscohadaAccount: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare isSystem: boolean;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 0,
    })
    declare sortOrder: number;
}

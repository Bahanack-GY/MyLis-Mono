import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'deduction_types',
})
export class DeductionType extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare isPercentage: boolean;

    @Column({
        type: DataType.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    })
    declare defaultAmount: number;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare isActive: boolean;
}

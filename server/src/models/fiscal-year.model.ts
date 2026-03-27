import { Column, DataType, Model, Table, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
    tableName: 'fiscal_years',
    indexes: [
        { fields: ['status'] },
        { fields: ['startDate', 'endDate'] },
    ],
})
export class FiscalYear extends Model {
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
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare startDate: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare endDate: string;

    @Column({
        type: DataType.ENUM('OPEN', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
    })
    declare status: 'OPEN' | 'CLOSED';

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare closedAt: Date | null;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare closedByUserId: string | null;

    @BelongsTo(() => User)
    declare closedBy: User;
}

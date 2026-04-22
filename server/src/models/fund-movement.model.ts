import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { Employee } from './employee.model';

@Table({
    tableName: 'fund_movements',
    indexes: [
        { fields: ['ceoUserId'] },
        { fields: ['date'] },
        { fields: ['type'] },
    ],
})
export class FundMovement extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @Column({ type: DataType.ENUM('APPORT', 'RETRAIT'), allowNull: false })
    declare type: 'APPORT' | 'RETRAIT';

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
    declare amount: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare description: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare date: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare ceoUserId: string;

    @BelongsTo(() => User, 'ceoUserId')
    declare ceoUser: User;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare createdByUserId: string;

    @BelongsTo(() => User, 'createdByUserId')
    declare createdByUser: User;

    @Column({ type: DataType.STRING, allowNull: true })
    declare journalEntryRef: string | null;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    declare justificationFiles: { filePath: string; originalName: string }[];
}

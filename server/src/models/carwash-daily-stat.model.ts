import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'carwash_daily_stats', timestamps: false })
export class CarwashDailyStat extends Model {
    @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
    declare id: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare stationId: number;

    @Column({ type: DataType.STRING, allowNull: true })
    declare stationName: string | null;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare date: string;

    @Column({ type: DataType.DECIMAL(15, 2), defaultValue: 0 })
    declare revenue: number;

    @Column({ type: DataType.DECIMAL(15, 2), defaultValue: 0 })
    declare expenses: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare vehicles: number;

    @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
    declare syncedAt: Date;
}

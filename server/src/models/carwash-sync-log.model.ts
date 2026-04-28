import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'carwash_sync_logs', timestamps: false })
export class CarwashSyncLog extends Model {
    @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
    declare id: number;

    @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
    declare syncedAt: Date;

    @Column({ type: DataType.STRING, defaultValue: 'success' })
    declare status: string;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare stationsCount: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare employeesCount: number;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare daysCount: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare error: string | null;
}

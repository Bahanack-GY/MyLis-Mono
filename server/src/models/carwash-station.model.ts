import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'carwash_stations', timestamps: true })
export class CarwashStation extends Model {
    @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: false })
    declare id: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare nom: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare adresse: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare town: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare contact: string | null;

    @Column({ type: DataType.STRING, defaultValue: 'active' })
    declare status: string;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare employeeCount: number;

    @Column({ type: DataType.STRING, allowNull: true })
    declare managerName: string | null;

    @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
    declare syncedAt: Date;
}

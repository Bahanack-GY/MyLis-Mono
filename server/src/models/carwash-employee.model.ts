import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'carwash_employees', timestamps: true })
export class CarwashEmployee extends Model {
    @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: false })
    declare id: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare nom: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare prenom: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare email: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare telephone: string | null;

    @Column({ type: DataType.STRING, allowNull: false })
    declare role: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: true })
    declare actif: boolean;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
    declare bonusParLavage: number | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare globalAccess: boolean;

    @Column({ type: DataType.INTEGER, allowNull: true })
    declare stationId: number | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare stationName: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare profilePicture: string | null;

    @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
    declare syncedAt: Date;
}

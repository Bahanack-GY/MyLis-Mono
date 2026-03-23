
import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table
export class Log extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @Column(DataType.STRING)
    declare action: string;

    @Column(DataType.STRING)
    declare userId: string;

    @Column(DataType.JSON)
    declare details: any;

    @Column(DataType.DATE)
    declare timestamp: Date;
}

import { Table, Column, Model, DataType, BelongsTo, ForeignKey, HasMany } from 'sequelize-typescript';
import { Department } from './department.model';
import { Project } from './project.model';

export enum ClientType {
    ONE_TIME = 'one_time',
    SUBSCRIPTION = 'subscription',
}

@Table
export class Client extends Model {
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

    @Column(DataType.TEXT)
    declare projectDescription: string;

    @Column(DataType.STRING) // Or DECIMAL if you prefer, but string is safer for currency sometimes if not doing math in DB
    declare price: string;

    @Column(DataType.STRING)
    srs: string; // Link to SRS document? Or text? Assuming string for now based on req.

    @Column(DataType.STRING)
    contract: string; // Link to contract?

    @Column({
        type: DataType.ENUM(...Object.values(ClientType)),
        allowNull: false,
        defaultValue: ClientType.ONE_TIME
    })
    declare type: ClientType;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @HasMany(() => Project)
    declare projects: Project[];
}

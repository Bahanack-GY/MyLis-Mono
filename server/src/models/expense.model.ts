import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Demand } from './demand.model';
import { Project } from './project.model';
import { Department } from './department.model';

@Table({
    tableName: 'expenses',
    indexes: [
        { fields: ['chargeFamily'] },
        { fields: ['chargeNature'] },
        { fields: ['date'] },
        { fields: ['chargeFamily', 'date'] },
        { fields: ['demandId'] },
    ],
})
export class Expense extends Model {
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
    declare title: string;

    @Column({
        type: DataType.DECIMAL,
        allowNull: false,
    })
    declare amount: number;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    declare chargeFamily: string;

    @Column({
        type: DataType.STRING(200),
        allowNull: false,
    })
    declare chargeNature: string;

    @Column({
        type: DataType.ENUM('MANUAL', 'PAYROLL'),
        allowNull: false,
        defaultValue: 'MANUAL',
    })
    declare source: 'MANUAL' | 'PAYROLL';

    @Column({
        type: DataType.ENUM('ONE_TIME', 'RECURRENT'),
        allowNull: false,
        defaultValue: 'ONE_TIME',
    })
    declare type: 'ONE_TIME' | 'RECURRENT';

    @Column({
        type: DataType.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'),
        allowNull: true,
    })
    declare frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare date: string;

    @ForeignKey(() => Demand)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare demandId: string | null;

    @BelongsTo(() => Demand)
    declare demand: Demand;

    @ForeignKey(() => Project)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare projectId: string | null;

    @BelongsTo(() => Project)
    declare project: Project;

    @ForeignKey(() => Department)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare departmentId: string | null;

    @BelongsTo(() => Department)
    declare department: Department;

    @Column({
        type: DataType.JSONB,
        allowNull: false,
        defaultValue: [],
    })
    declare justificationFiles: { filePath: string; originalName: string }[];
}

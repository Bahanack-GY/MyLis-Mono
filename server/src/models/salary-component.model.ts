import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from './employee.model';

/**
 * Salary component: prime, indemnité, or avantage en nature attached to an employee.
 * Used to build the detailed gross salary before payroll calculation.
 */
@Table({
    tableName: 'salary_components',
    indexes: [
        { fields: ['employeeId'] },
        { fields: ['type'] },
    ],
})
export class SalaryComponent extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Employee)
    @Column({ type: DataType.UUID, allowNull: false })
    declare employeeId: string;

    @BelongsTo(() => Employee)
    declare employee: Employee;

    // PRIME | INDEMNITE | AVANTAGE_NATURE | RETENUE
    @Column({ type: DataType.STRING(30), allowNull: false })
    declare type: 'PRIME' | 'INDEMNITE' | 'AVANTAGE_NATURE' | 'RETENUE';

    @Column({ type: DataType.STRING, allowNull: false })
    declare label: string;

    @Column({ type: DataType.DECIMAL(15, 2), allowNull: false, defaultValue: 0 })
    declare amount: number;

    // Included in CNPS cotisable base?
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    declare cnpsBase: boolean;

    // Included in IRPP taxable base?
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    declare taxable: boolean;

    // Legal cap for exoneration (0 = no cap). If amount > cap without justification → warning.
    @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
    declare cap: number | null;

    // URL of attached justificatif (required when exonerated amount > 0)
    @Column({ type: DataType.TEXT, allowNull: true })
    declare justificatifUrl: string | null;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    declare isActive: boolean;
}

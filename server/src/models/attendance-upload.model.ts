import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { AttendanceRecord } from './attendance-record.model';

@Table({ tableName: 'attendance_uploads', indexes: [{ unique: true, fields: ['year', 'month'] }] })
export class AttendanceUpload extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare year: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare month: number;

    @Column({ type: DataType.STRING, allowNull: false })
    declare fileName: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare filePath: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare uploadedByUserId: string | null;

    @BelongsTo(() => User)
    declare uploadedBy: User;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare employeeCount: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare daysCount: number;

    @HasMany(() => AttendanceRecord, { onDelete: 'CASCADE' })
    declare records: AttendanceRecord[];
}

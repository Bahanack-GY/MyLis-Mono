import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AttendanceUpload } from './attendance-upload.model';

export interface AttendanceDayPair {
    sw: string | null; // start-work time HH:MM, null if absent
    ew: string | null; // end-work time HH:MM, null if absent
}

export interface AttendanceDay {
    day: number;            // 1-31
    pairs: AttendanceDayPair[]; // 0..n check-in/out pairs for the day
}

@Table({ tableName: 'attendance_records' })
export class AttendanceRecord extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => AttendanceUpload)
    @Column({ type: DataType.UUID, allowNull: false })
    declare uploadId: string;

    @BelongsTo(() => AttendanceUpload)
    declare upload: AttendanceUpload;

    @Column({ type: DataType.STRING, allowNull: false })
    declare employeeName: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare department: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare externalEmployeeId: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare cardNumber: string | null;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    declare days: AttendanceDay[];

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare presentDays: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare absentDays: number;
}

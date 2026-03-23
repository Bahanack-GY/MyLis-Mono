
import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Meeting } from './meeting.model';
import { Employee } from './employee.model';

@Table
export class MeetingParticipant extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Meeting)
    @Column(DataType.UUID)
    declare meetingId: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;
}

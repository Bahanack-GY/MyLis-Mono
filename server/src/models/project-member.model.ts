import { Table, Column, Model, ForeignKey, DataType } from 'sequelize-typescript';
import { Project } from './project.model';
import { Employee } from './employee.model';

@Table
export class ProjectMember extends Model {
    @ForeignKey(() => Project)
    @Column(DataType.UUID)
    declare projectId: string;

    @ForeignKey(() => Employee)
    @Column(DataType.UUID)
    declare employeeId: string;
}

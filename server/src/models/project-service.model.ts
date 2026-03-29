import { Table, Column, Model, ForeignKey, DataType } from 'sequelize-typescript';
import { Project } from './project.model';
import { DepartmentService } from './department-service.model';

@Table({ tableName: 'project_services' })
export class ProjectService extends Model {
    @ForeignKey(() => Project)
    @Column(DataType.UUID)
    declare projectId: string;

    @ForeignKey(() => DepartmentService)
    @Column(DataType.UUID)
    declare departmentServiceId: string;
}

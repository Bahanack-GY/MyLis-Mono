import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Project } from './project.model';

@Table({ tableName: 'project_milestones' })
export class ProjectMilestone extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    declare id: string;

    @ForeignKey(() => Project)
    @Column({ type: DataType.UUID, allowNull: false })
    declare projectId: string;

    @BelongsTo(() => Project)
    declare project: Project;

    @Column({ type: DataType.STRING, allowNull: false })
    declare title: string;

    @Column(DataType.TEXT)
    declare description: string;

    @Column(DataType.DATE)
    declare dueDate: Date;

    @Column({ type: DataType.DATE, allowNull: true, defaultValue: null })
    declare completedAt: Date | null;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare order: number;
}


import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { Department } from './department.model';
import { Position } from './position.model';
import { Team } from './team.model';
import { Task } from './task.model';
import { Document as HrDocument } from './document.model';
import { Formation } from './formation.model';
import { Entretien } from './entretien.model';
import { Sanction } from './sanction.model';
import { Project } from './project.model';
import { ProjectMember } from './project-member.model';
import { EmployeeBadge } from './employee-badge.model';
import { BelongsToMany } from 'sequelize-typescript';

@Table({
    indexes: [
        { unique: true, fields: ['userId'] },
        { fields: ['departmentId'] },
        { fields: ['dismissed'] },
        { fields: ['points'] },
    ],
})
export class Employee extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare userId: string;

    @BelongsTo(() => User)
    declare user: User;

    @Column(DataType.STRING)
    declare firstName: string;

    @Column(DataType.STRING)
    declare lastName: string;

    @ForeignKey(() => Department)
    @Column(DataType.UUID)
    declare departmentId: string;

    @BelongsTo(() => Department)
    declare department: Department;

    @ForeignKey(() => Position)
    @Column(DataType.UUID)
    declare positionId: string;

    @BelongsTo(() => Position)
    declare position: Position;

    @ForeignKey(() => Team)
    @Column(DataType.UUID)
    declare teamId: string;

    @BelongsTo(() => Team)
    declare team: Team;

    @Column({
        type: DataType.STRING,
        unique: true,
    })
    declare phoneNumber: string;

    @Column(DataType.TEXT)
    declare avatarUrl: string;

    @Column(DataType.DATE)
    declare hireDate: Date;

    @Column(DataType.STRING)
    declare address: string;

    @Column(DataType.DATE)
    declare birthDate: Date;

    @Column(DataType.FLOAT)
    declare salary: number;

    @Column({
        type: DataType.JSON,
        allowNull: true,
        defaultValue: [],
    })
    declare skills: string[];

    @Column({
        type: DataType.JSON,
        allowNull: true,
        defaultValue: [],
    })
    declare educationDocs: { name: string; type: string; filePath?: string }[];

    @Column({
        type: DataType.JSON,
        allowNull: true,
        defaultValue: [],
    })
    declare recruitmentDocs: { name: string; type: string; filePath?: string }[];

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare dismissed: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare dismissedAt: Date | null;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare points: number;

    @HasMany(() => Task)
    declare tasks: Task[];

    @HasMany(() => EmployeeBadge)
    declare badges: EmployeeBadge[];

    @HasMany(() => HrDocument)
    declare documents: HrDocument[];

    @HasMany(() => Formation)
    declare formations: Formation[];

    @HasMany(() => Entretien)
    declare entretiens: Entretien[];

    @HasMany(() => Sanction)
    declare sanctions: Sanction[];

    @BelongsToMany(() => Project, () => ProjectMember)
    declare projects: Project[];
}

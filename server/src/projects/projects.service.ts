import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { ProjectMilestone } from '../models/project-milestone.model';
import { Client } from '../models/client.model';
import { Department } from '../models/department.model';
import { DepartmentService } from '../models/department-service.model';
import { ProjectService } from '../models/project-service.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Task } from '../models/task.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectModel(Project)
        private projectModel: typeof Project,
        @InjectModel(ProjectMember)
        private projectMemberModel: typeof ProjectMember,
        @InjectModel(ProjectMilestone)
        private milestoneModel: typeof ProjectMilestone,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) { }

    /* ── Milestone CRUD ──────────────────────────────────── */

    async createMilestone(projectId: string, dto: { title: string; description?: string; dueDate?: string; order?: number }): Promise<ProjectMilestone> {
        const project = await this.projectModel.findByPk(projectId);
        if (!project) throw new NotFoundException('Project not found');
        return this.milestoneModel.create({ ...dto, projectId } as any);
    }

    async updateMilestone(projectId: string, milestoneId: string, dto: { title?: string; description?: string; dueDate?: string; order?: number }): Promise<ProjectMilestone> {
        const ms = await this.milestoneModel.findOne({ where: { id: milestoneId, projectId } });
        if (!ms) throw new NotFoundException('Milestone not found');
        await ms.update(dto);
        return ms;
    }

    async toggleMilestone(projectId: string, milestoneId: string): Promise<ProjectMilestone> {
        const ms = await this.milestoneModel.findOne({ where: { id: milestoneId, projectId } });
        if (!ms) throw new NotFoundException('Milestone not found');
        await ms.update({ completedAt: ms.completedAt ? null : new Date() });
        return ms;
    }

    async deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
        const ms = await this.milestoneModel.findOne({ where: { id: milestoneId, projectId } });
        if (!ms) throw new NotFoundException('Milestone not found');
        await ms.destroy();
    }

    async findAll(): Promise<Project[]> {
        return this.projectModel.findAll({
            include: [
                Client,
                Department,
                { model: DepartmentService, through: { attributes: [] } },
                { model: Task, attributes: ['id', 'state'] },
                { model: ProjectMilestone, attributes: ['id', 'title', 'completedAt', 'dueDate', 'order'], order: [['order', 'ASC'], ['createdAt', 'ASC']] },
            ],
        });
    }

    async findOne(id: string): Promise<Project | null> {
        return this.projectModel.findByPk(id, {
            include: [
                Client,
                Department,
                { model: DepartmentService, through: { attributes: [] } },
                { model: Employee, through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
                {
                    model: Task,
                    include: [{ model: Employee, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
                },
                { model: ProjectMilestone, order: [['order', 'ASC'], ['createdAt', 'ASC']] },
            ],
        });
    }

    async create(createProjectDto: any): Promise<Project> {
        const { serviceIds, ...projectData } = createProjectDto;
        const project = await this.projectModel.create(projectData);

        if (serviceIds?.length) {
            await (project as any).$set('services', serviceIds);
        }

        // Notify department employees about new project
        if (createProjectDto.departmentId) {
            const employees = await this.employeeModel.findAll({
                where: { departmentId: createProjectDto.departmentId, dismissed: false },
                include: [User],
            });
            const _projectName = project.getDataValue('name') || project.getDataValue('title') || 'Untitled';
            const notifications = employees
                .filter(e => e.userId)
                .map(e => ({
                    title: 'New project created',
                    body: `A new project "${_projectName}" has been created in your department`,
                    titleFr: 'Nouveau projet créé',
                    bodyFr: `Un nouveau projet "${_projectName}" a été créé dans votre département`,
                    type: 'project',
                    userId: e.userId,
                }));
            if (notifications.length > 0) {
                await this.notificationsService.createMany(notifications);
            }
        }

        return project;
    }

    async update(id: string, updateProjectDto: any): Promise<[number, Project[]]> {
        const { serviceIds, ...projectData } = updateProjectDto;
        const result = await this.projectModel.update(projectData, { where: { id }, returning: true });

        if (serviceIds !== undefined) {
            const project = await this.projectModel.findByPk(id);
            if (project) {
                await (project as any).$set('services', serviceIds);
            }
        }

        // Notify on project completion
        if (updateProjectDto.status === 'COMPLETED') {
            const project = result[1]?.[0];
            if (project) {
                const deptId = project.getDataValue('departmentId');
                if (deptId) {
                    const employees = await this.employeeModel.findAll({
                        where: { departmentId: deptId, dismissed: false },
                        include: [User],
                    });
                    const projectName = project.getDataValue('name') || project.getDataValue('title') || 'Untitled';
                    const notifications = employees
                        .filter(e => e.userId)
                        .map(e => ({
                            title: 'Project completed',
                            body: `The project "${projectName}" has been marked as completed`,
                            titleFr: 'Projet terminé',
                            bodyFr: `Le projet "${projectName}" a été marqué comme terminé`,
                            type: 'project',
                            userId: e.userId,
                        }));
                    if (notifications.length > 0) {
                        await this.notificationsService.createMany(notifications);
                    }
                }
            }
        }

        return result;
    }

    async remove(id: string): Promise<void> {
        const project = await this.findOne(id);
        if (project) {
            await project.destroy();
        }
    }

    async findByClient(clientId: string): Promise<Project[]> {
        return this.projectModel.findAll({
            where: { clientId },
            include: [Client, Department, { model: DepartmentService, through: { attributes: [] } }, { model: Task, attributes: ['id', 'state'] }, { model: ProjectMilestone, attributes: ['id', 'completedAt'] }],
        });
    }

    async findByDepartment(departmentId: string): Promise<Project[]> {
        return this.projectModel.findAll({
            where: { departmentId },
            include: [Client, Department, { model: DepartmentService, through: { attributes: [] } }, { model: Task, attributes: ['id', 'state'] }, { model: ProjectMilestone, attributes: ['id', 'completedAt'] }],
        });
    }

    async findByDepartmentForEmployee(departmentId: string) {
        return this.projectModel.findAll({
            where: { departmentId },
            attributes: { exclude: ['budget', 'revenue', 'clientId'] },
            include: [
                { model: Department, attributes: ['id', 'name'] },
                { model: Employee, through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
                { model: Task, attributes: ['id', 'state'] },
                { model: ProjectMilestone, attributes: ['id', 'completedAt'] },
            ],
        });
    }

    async findOneForEmployee(id: string) {
        return this.projectModel.findByPk(id, {
            attributes: { exclude: ['budget', 'revenue', 'clientId'] },
            include: [
                { model: Department, attributes: ['id', 'name'] },
                { model: Employee, through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
                {
                    model: Task,
                    include: [{ model: Employee, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
                },
                { model: ProjectMilestone, attributes: ['id', 'title', 'completedAt', 'dueDate', 'order', 'description'], order: [['order', 'ASC'], ['createdAt', 'ASC']] },
            ],
        });
    }
}

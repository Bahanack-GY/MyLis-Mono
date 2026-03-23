import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { Client } from '../models/client.model';
import { Department } from '../models/department.model';
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
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) { }

    async findAll(): Promise<Project[]> {
        return this.projectModel.findAll({
            include: [
                Client,
                Department,
                { model: Task, attributes: ['id', 'state'] },
            ],
        });
    }

    async findOne(id: string): Promise<Project | null> {
        return this.projectModel.findByPk(id, {
            include: [
                Client,
                Department,
                { model: Employee, through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
                {
                    model: Task,
                    include: [{ model: Employee, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] }],
                },
            ],
        });
    }

    async create(createProjectDto: any): Promise<Project> {
        const project = await this.projectModel.create(createProjectDto);

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
        const result = await this.projectModel.update(updateProjectDto, { where: { id }, returning: true });

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
            include: [Client, Department, { model: Task, attributes: ['id', 'state'] }],
        });
    }

    async findByDepartment(departmentId: string): Promise<Project[]> {
        return this.projectModel.findAll({
            where: { departmentId },
            include: [Client, Department, { model: Task, attributes: ['id', 'state'] }],
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
            ],
        });
    }
}

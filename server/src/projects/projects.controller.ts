import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Query, Request } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ProjectsService } from './projects.service';
import { Project } from '../models/project.model';
import { Employee } from '../models/employee.model';
import { Roles } from '../auth/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
@Controller('projects')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProjectsController {
    constructor(
        private readonly projectsService: ProjectsService,
        @InjectModel(Employee)
        private readonly employeeModel: typeof Employee,
    ) { }

    @Post()
    create(@Body() createProjectDto: any): Promise<Project> {
        return this.projectsService.create(createProjectDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
    @Get('my-projects')
    async findMyProjects(@Request() req) {
        if (req.user.role === 'MANAGER' || req.user.role === 'ACCOUNTANT') {
            return this.projectsService.findAll();
        }
        const employee = await this.employeeModel.findOne({ where: { userId: req.user.userId } });
        const deptId = employee?.getDataValue('departmentId');
        if (!deptId) return [];
        return this.projectsService.findByDepartmentForEmployee(deptId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get('my-projects/:id')
    async findMyProjectDetail(@Param('id') id: string) {
        return this.projectsService.findOneForEmployee(id);
    }

    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req): Promise<Project[]> {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return deptId ? this.projectsService.findByDepartment(deptId) : this.projectsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string): Promise<Project | null> {
        return this.projectsService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateProjectDto: any): Promise<[number, Project[]]> {
        return this.projectsService.update(id, updateProjectDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string): Promise<void> {
        return this.projectsService.remove(id);
    }

    @Get('client/:clientId')
    findByClient(@Param('clientId') clientId: string): Promise<Project[]> {
        return this.projectsService.findByClient(clientId);
    }

    @Get('department/:departmentId')
    findByDepartment(@Param('departmentId') departmentId: string): Promise<Project[]> {
        return this.projectsService.findByDepartment(departmentId);
    }
}

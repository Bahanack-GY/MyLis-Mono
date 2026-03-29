
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Department } from '../models/department.model';
import { DepartmentGoal } from '../models/department-goal.model';
import { DepartmentService } from '../models/department-service.model';
import { Position } from '../models/position.model';
import { Team } from '../models/team.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Project } from '../models/project.model';
import { ProjectService } from '../models/project-service.model';
import { LeadNeed } from '../models/lead-need.model';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentGoalsService } from './department-goals.service';
import { DepartmentGoalsController } from './department-goals.controller';
import { DepartmentServicesService } from './department-services.service';
import { DepartmentServicesController } from './department-services.controller';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
    imports: [SequelizeModule.forFeature([Department, DepartmentGoal, DepartmentService, Position, Team, Employee, User, Project, ProjectService, LeadNeed])],
    controllers: [DepartmentsController, DepartmentGoalsController, DepartmentServicesController, PositionsController, TeamsController],
    providers: [DepartmentsService, DepartmentGoalsService, DepartmentServicesService, PositionsService, TeamsService],
    exports: [DepartmentsService, DepartmentGoalsService, DepartmentServicesService, PositionsService, TeamsService],
})
export class OrganizationModule { }


import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Department } from '../models/department.model';
import { DepartmentGoal } from '../models/department-goal.model';
import { Position } from '../models/position.model';
import { Team } from '../models/team.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentGoalsService } from './department-goals.service';
import { DepartmentGoalsController } from './department-goals.controller';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
    imports: [SequelizeModule.forFeature([Department, DepartmentGoal, Position, Team, Employee, User])],
    controllers: [DepartmentsController, DepartmentGoalsController, PositionsController, TeamsController],
    providers: [DepartmentsService, DepartmentGoalsService, PositionsService, TeamsService],
    exports: [DepartmentsService, DepartmentGoalsService, PositionsService, TeamsService],
})
export class OrganizationModule { }

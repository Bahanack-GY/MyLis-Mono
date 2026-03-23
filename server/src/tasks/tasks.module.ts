
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Task } from '../models/task.model';
import { Subtask } from '../models/subtask.model';
import { Employee } from '../models/employee.model';
import { Team } from '../models/team.model';
import { Project } from '../models/project.model';
import { Ticket } from '../models/ticket.model';
import { Department } from '../models/department.model';
import { TaskHistory } from '../models/task-history.model';
import { TaskNature } from '../models/task-nature.model';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EmployeeTasksController } from './employee-tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
    imports: [SequelizeModule.forFeature([Task, Subtask, Employee, Team, Project, Ticket, Department, TaskHistory, TaskNature]), NotificationsModule, GamificationModule],
    controllers: [EmployeeTasksController, TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule { }

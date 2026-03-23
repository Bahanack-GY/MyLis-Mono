import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { Employee } from '../models/employee.model';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [SequelizeModule.forFeature([Project, ProjectMember, Employee]), NotificationsModule],
    controllers: [ProjectsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule { }

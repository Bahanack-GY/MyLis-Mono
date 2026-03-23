
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Employee } from '../models/employee.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { Task } from '../models/task.model';
import { GamificationService } from './gamification.service';

@Module({
    imports: [SequelizeModule.forFeature([Employee, EmployeeBadge, Task])],
    providers: [GamificationService],
    exports: [GamificationService],
})
export class GamificationModule { }

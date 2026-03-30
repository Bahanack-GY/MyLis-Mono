
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Employee } from '../models/employee.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { EmployeeTransferHistory } from '../models/employee-transfer-history.model';
import { EmployeePromotionHistory } from '../models/employee-promotion-history.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { Task } from '../models/task.model';
import { Report } from '../models/report.model';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Employee, EmployeeBadge, EmployeeTransferHistory, EmployeePromotionHistory, Department, User, Task, Report]),
        UsersModule,
        NotificationsModule,
        ChatModule,
    ],
    controllers: [EmployeesController],
    providers: [EmployeesService],
    exports: [EmployeesService],
})
export class EmployeesModule { }

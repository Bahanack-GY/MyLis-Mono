
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Ticket } from '../models/ticket.model';
import { Task } from '../models/task.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [SequelizeModule.forFeature([Ticket, Task, Employee, Department]), TasksModule, NotificationsModule],
    controllers: [TicketsController],
    providers: [TicketsService],
    exports: [TicketsService],
})
export class TicketsModule { }

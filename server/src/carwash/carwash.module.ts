import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CarwashStation } from '../models/carwash-station.model';
import { CarwashEmployee } from '../models/carwash-employee.model';
import { CarwashDailyStat } from '../models/carwash-daily-stat.model';
import { CarwashSyncLog } from '../models/carwash-sync-log.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { DepartmentService as DeptServiceModel } from '../models/department-service.model';
import { AccountingModule } from '../accounting/accounting.module';
import { CarwashSyncService } from './carwash-sync.service';
import { CarwashController } from './carwash.controller';

@Module({
    imports: [
        SequelizeModule.forFeature([
            CarwashStation, CarwashEmployee, CarwashDailyStat, CarwashSyncLog,
            Employee, User, Department, Position, DeptServiceModel,
        ]),
        AccountingModule,
    ],
    providers: [CarwashSyncService],
    controllers: [CarwashController],
})
export class CarwashModule {}

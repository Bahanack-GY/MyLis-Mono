
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { LeaveRequest } from '../models/leave-request.model';
import { LeaveBalance } from '../models/leave-balance.model';
import { Employee } from '../models/employee.model';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        SequelizeModule.forFeature([LeaveRequest, LeaveBalance, Employee]),
        NotificationsModule,
    ],
    controllers: [LeavesController],
    providers: [LeavesService],
    exports: [LeavesService],
})
export class LeavesModule {}

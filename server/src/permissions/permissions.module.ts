
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionRequest } from '../models/permission-request.model';
import { Employee } from '../models/employee.model';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        SequelizeModule.forFeature([PermissionRequest, Employee]),
        NotificationsModule,
    ],
    controllers: [PermissionsController],
    providers: [PermissionsService],
    exports: [PermissionsService],
})
export class PermissionsModule {}

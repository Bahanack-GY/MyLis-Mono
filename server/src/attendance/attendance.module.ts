import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AttendanceUpload } from '../models/attendance-upload.model';
import { AttendanceRecord } from '../models/attendance-record.model';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
    imports: [SequelizeModule.forFeature([AttendanceUpload, AttendanceRecord])],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule {}

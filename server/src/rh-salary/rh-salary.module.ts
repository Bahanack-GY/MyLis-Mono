import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RhSalaryController } from './rh-salary.controller';
import { RhSalaryService } from './rh-salary.service';
import { Employee } from '../models/employee.model';
import { AttendanceUpload } from '../models/attendance-upload.model';
import { AttendanceRecord } from '../models/attendance-record.model';
import { LeaveRequest } from '../models/leave-request.model';
import { SalaryComponent } from '../models/salary-component.model';
import { User } from '../models/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Employee,
      AttendanceUpload,
      AttendanceRecord,
      LeaveRequest,
      SalaryComponent,
      User,
    ]),
  ],
  controllers: [RhSalaryController],
  providers: [RhSalaryService],
})
export class RhSalaryModule {}

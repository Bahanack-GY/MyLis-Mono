import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SalaryController } from './salary.controller';
import { SalaryService } from './salary.service';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { Expense } from '../models/expense.model';

@Module({
    imports: [SequelizeModule.forFeature([Employee, Department, User, Expense])],
    controllers: [SalaryController],
    providers: [SalaryService],
})
export class SalaryModule {}

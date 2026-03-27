import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayrollRun } from '../models/payroll-run.model';
import { Payslip } from '../models/payslip.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { Expense } from '../models/expense.model';
import { DeductionType } from '../models/deduction-type.model';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [
        SequelizeModule.forFeature([PayrollRun, Payslip, Employee, Department, User, Expense, DeductionType]),
        AccountingModule,
    ],
    controllers: [PayrollController],
    providers: [PayrollService, PayrollCalculatorService],
    exports: [PayrollService, PayrollCalculatorService],
})
export class PayrollModule {}

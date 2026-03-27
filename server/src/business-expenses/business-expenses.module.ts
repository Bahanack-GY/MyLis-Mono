import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BusinessExpense } from '../models/business-expense.model';
import { BusinessExpenseType } from '../models/business-expense-type.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { BusinessExpensesService } from './business-expenses.service';
import { BusinessExpensesController } from './business-expenses.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
    imports: [
        SequelizeModule.forFeature([BusinessExpense, BusinessExpenseType, Employee, User]),
        NotificationsModule,
        ExpensesModule,
    ],
    controllers: [BusinessExpensesController],
    providers: [BusinessExpensesService],
    exports: [BusinessExpensesService],
})
export class BusinessExpensesModule {}

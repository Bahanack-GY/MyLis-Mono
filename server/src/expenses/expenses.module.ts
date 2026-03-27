import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from '../models/expense.model';
import { Project } from '../models/project.model';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [SequelizeModule.forFeature([Expense, Project]), AccountingModule],
    providers: [ExpensesService],
    controllers: [ExpensesController],
    exports: [ExpensesService],
})
export class ExpensesModule { }

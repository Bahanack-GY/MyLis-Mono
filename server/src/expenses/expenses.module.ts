import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from '../models/expense.model';
import { Project } from '../models/project.model';

@Module({
    imports: [SequelizeModule.forFeature([Expense, Project])],
    providers: [ExpensesService],
    controllers: [ExpensesController],
    exports: [ExpensesService],
})
export class ExpensesModule { }

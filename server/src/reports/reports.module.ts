import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from '../models/report.model';
import { Task } from '../models/task.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { Demand } from '../models/demand.model';
import { DemandItem } from '../models/demand-item.model';
import { Ticket } from '../models/ticket.model';
import { BusinessExpense } from '../models/business-expense.model';
import { BusinessExpenseType } from '../models/business-expense-type.model';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { Lead } from '../models/lead.model';
import { CommercialGoal } from '../models/commercial-goal.model';
import { Invoice } from '../models/invoice.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { Account } from '../models/account.model';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { Budget } from '../models/budget.model';
import { TaxDeclaration } from '../models/tax-declaration.model';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [
        SequelizeModule.forFeature([
            Report,
            Task,
            Employee,
            Department,
            Demand,
            DemandItem,
            Ticket,
            BusinessExpense,
            BusinessExpenseType,
            Project,
            ProjectMember,
            Lead,
            CommercialGoal,
            Invoice,
            FiscalYear,
            Account,
            JournalEntry,
            JournalEntryLine,
            Budget,
            TaxDeclaration,
        ]),
        AccountingModule,
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule {}

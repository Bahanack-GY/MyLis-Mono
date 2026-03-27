import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Account } from '../models/account.model';
import { AccountCategory } from '../models/account-category.model';
import { Journal } from '../models/journal.model';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { FiscalYear } from '../models/fiscal-year.model';
import { CreditNote } from '../models/credit-note.model';
import { Budget } from '../models/budget.model';
import { Invoice } from '../models/invoice.model';
import { Department } from '../models/department.model';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { FiscalYearsService } from './fiscal-years.service';
import { FiscalYearsController } from './fiscal-years.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEngineService } from './journal-engine.service';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { CreditNotesService } from './credit-notes.service';
import { CreditNotesController } from './credit-notes.controller';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';

@Module({
    imports: [
        SequelizeModule.forFeature([
            Account,
            AccountCategory,
            Journal,
            JournalEntry,
            JournalEntryLine,
            FiscalYear,
            CreditNote,
            Budget,
            Invoice,
            Department,
        ]),
    ],
    controllers: [
        AccountsController,
        FiscalYearsController,
        JournalEntriesController,
        ReportsController,
        CreditNotesController,
        BudgetsController,
    ],
    providers: [
        AccountsService,
        FiscalYearsService,
        JournalEntriesService,
        JournalEngineService,
        ReportsService,
        CreditNotesService,
        BudgetsService,
    ],
    exports: [
        JournalEngineService,
        FiscalYearsService,
        AccountsService,
        ReportsService,
    ],
})
export class AccountingModule {}

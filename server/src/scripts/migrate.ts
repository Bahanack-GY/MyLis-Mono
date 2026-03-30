
/**
 * Migration script — brings the database schema in sync with all Sequelize models.
 *
 * Uses sequelize.sync({ alter: true }) which non-destructively:
 *   - Creates missing tables
 *   - Adds missing columns to existing tables
 *   - Does NOT drop or rename anything
 *
 * Usage:  npx ts-node src/scripts/migrate.ts
 */

import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';

// Import ALL models
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { Team } from '../models/team.model';
import { Task } from '../models/task.model';
import { Subtask } from '../models/subtask.model';
import { TaskNature } from '../models/task-nature.model';
import { TaskHistory } from '../models/task-history.model';
import { TaskAttachment } from '../models/task-attachment.model';
import { Ticket } from '../models/ticket.model';
import { Client } from '../models/client.model';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { ProjectService } from '../models/project-service.model';
import { ProjectMilestone } from '../models/project-milestone.model';
import { Log } from '../models/log.model';
import { Entretien } from '../models/entretien.model';
import { Formation } from '../models/formation.model';
import { Sanction } from '../models/sanction.model';
import { Document } from '../models/document.model';
import { DepartmentGoal } from '../models/department-goal.model';
import { DepartmentService } from '../models/department-service.model';
import { DepartmentMonthlyTarget } from '../models/department-monthly-target.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { EmployeeTransferHistory } from '../models/employee-transfer-history.model';
import { Invoice } from '../models/invoice.model';
import { InvoiceItem } from '../models/invoice-item.model';
import { InvoiceTemplate } from '../models/invoice-template.model';
import { Channel } from '../models/channel.model';
import { ChannelMember } from '../models/channel-member.model';
import { Message } from '../models/message.model';
import { Meeting } from '../models/meeting.model';
import { MeetingParticipant } from '../models/meeting-participant.model';
import { Notification } from '../models/notification.model';
import { Demand } from '../models/demand.model';
import { DemandItem } from '../models/demand-item.model';
import { Expense } from '../models/expense.model';

// Accounting models
import { FiscalYear } from '../models/fiscal-year.model';
import { AccountCategory } from '../models/account-category.model';
import { Account } from '../models/account.model';
import { Journal } from '../models/journal.model';
import { JournalEntry } from '../models/journal-entry.model';
import { JournalEntryLine } from '../models/journal-entry-line.model';
import { TaxConfig } from '../models/tax-config.model';
import { PayrollRun } from '../models/payroll-run.model';
import { Payslip } from '../models/payslip.model';
import { TaxDeclaration } from '../models/tax-declaration.model';
import { CreditNote } from '../models/credit-note.model';
import { Budget } from '../models/budget.model';
import { DeductionType } from '../models/deduction-type.model';

// Commercial models
import { Lead } from '../models/lead.model';
import { LeadActivity } from '../models/lead-activity.model';
import { LeadContact } from '../models/lead-contact.model';
import { LeadNeed } from '../models/lead-need.model';
import { ClientPayment } from '../models/client-payment.model';
import { CommercialGoal } from '../models/commercial-goal.model';

// Business expenses
import { BusinessExpenseType } from '../models/business-expense-type.model';
import { BusinessExpense } from '../models/business-expense.model';

// Reports
import { Report } from '../models/report.model';

dotenv.config();

async function migrate() {
    const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'mylisapp_db',
        models: [
            User,
            Employee,
            Department,
            Position,
            Team,
            TaskNature,
            Task,
            Subtask,
            TaskAttachment,
            TaskHistory,
            Ticket,
            Client,
            Project,
            ProjectMember,
            ProjectService,
            ProjectMilestone,
            Log,
            Entretien,
            Formation,
            Sanction,
            Document,
            DepartmentGoal,
            DepartmentService,
            DepartmentMonthlyTarget,
            EmployeeBadge,
            EmployeeTransferHistory,
            Invoice,
            InvoiceItem,
            InvoiceTemplate,
            Channel,
            ChannelMember,
            Message,
            Meeting,
            MeetingParticipant,
            Notification,
            Demand,
            DemandItem,
            Expense,

            // Accounting (parent tables first)
            FiscalYear,
            AccountCategory,
            Account,
            Journal,
            JournalEntry,
            JournalEntryLine,
            TaxConfig,
            PayrollRun,
            Payslip,
            TaxDeclaration,
            CreditNote,
            Budget,
            DeductionType,

            // Commercial (Lead depends on Employee + Client, LeadActivity depends on Lead)
            Lead,
            LeadActivity,
            LeadContact,       // depends on Lead
            LeadNeed,          // depends on Lead + DepartmentService
            ClientPayment,
            CommercialGoal,   // depends on Employee

            // Business expenses (type before expense)
            BusinessExpenseType,
            BusinessExpense,

            // Reports (depends on User, Employee, Department)
            Report,
        ],
        logging: (sql) => console.log(sql),
    });

    try {
        await sequelize.authenticate();
        console.log('\n✓ Database connection established.\n');

        // Pre-create tables that other models reference via FK but may not exist yet.
        // sync({ alter: true }) processes models in declaration order, so a FK to a
        // not-yet-created table causes "relation does not exist". Creating stubs first
        // ensures all parent tables exist before any FK is added.
        console.log('Pass 1 — pre-creating missing parent tables...\n');
        const stubTables = [
            '"leads"',
            '"lead_activities"',
            '"lead_contacts"',
            '"lead_needs"',
            '"project_services"',
            '"EmployeeTransferHistories"',
            '"Subtasks"',
            '"task_attachments"',
            '"fiscal_years"',
            '"account_categories"',
            '"accounts"',
            '"journals"',
            '"journal_entries"',
            '"journal_entry_lines"',
            '"tax_configs"',
            '"payroll_runs"',
            '"payslips"',
            '"tax_declarations"',
            '"credit_notes"',
            '"budgets"',
            '"deduction_types"',
            '"client_payments"',
            '"commercial_goals"',
            '"BusinessExpenseTypes"',
            '"business_expenses"',
            '"Reports"',
        ];
        for (const table of stubTables) {
            await sequelize.query(
                `CREATE TABLE IF NOT EXISTS ${table} ("id" UUID NOT NULL DEFAULT gen_random_uuid(), PRIMARY KEY ("id"))`,
            );
        }

        console.log('Pass 2 — altering all tables to match current models...\n');
        await sequelize.sync({ alter: true });

        console.log('\n✓ Migration complete — schema is now in sync with all models.\n');
    } catch (err) {
        console.error('\n✗ Migration failed:', err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();

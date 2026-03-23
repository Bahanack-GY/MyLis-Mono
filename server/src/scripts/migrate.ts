
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
import { Ticket } from '../models/ticket.model';
import { Client } from '../models/client.model';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/project-member.model';
import { Log } from '../models/log.model';
import { Entretien } from '../models/entretien.model';
import { Formation } from '../models/formation.model';
import { Sanction } from '../models/sanction.model';
import { Document } from '../models/document.model';
import { DepartmentGoal } from '../models/department-goal.model';
import { EmployeeBadge } from '../models/employee-badge.model';
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
            TaskHistory,
            Ticket,
            Client,
            Project,
            ProjectMember,
            Log,
            Entretien,
            Formation,
            Sanction,
            Document,
            DepartmentGoal,
            EmployeeBadge,
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
        ],
        logging: (sql) => console.log(sql),
    });

    try {
        await sequelize.authenticate();
        console.log('\n✓ Database connection established.\n');

        console.log('Running ALTER sync — adding missing tables & columns...\n');
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

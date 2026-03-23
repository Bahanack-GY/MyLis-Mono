
import { Sequelize } from 'sequelize-typescript';
import { User } from '../models/user.model';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { Team } from '../models/team.model';
import { Task } from '../models/task.model';
import { Ticket } from '../models/ticket.model';
import { Client } from '../models/client.model';
import { Project } from '../models/project.model';
import { Log } from '../models/log.model';
import { Entretien } from '../models/entretien.model';
import { Formation } from '../models/formation.model';
import { Sanction } from '../models/sanction.model';
import { Document } from '../models/document.model';
import { ProjectMember } from '../models/project-member.model';
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

dotenv.config();

async function seed() {
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
            Task,
            Ticket,
            Client,
            Project,
            Log,
            Entretien,
            Formation,
            Sanction,
            Document,
            ProjectMember,
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
        ],
        logging: false,
    });

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Sync models (optional, but good to ensure tables exist)
        await sequelize.sync();

        const adminEmail = 'admin@mylisapp.com';
        const existingUser = await User.findOne({ where: { email: adminEmail } });

        if (!existingUser) {
            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash('abc123def', salt);

            await User.create({
                email: adminEmail,
                passwordHash: passwordHash,
                role: 'MANAGER',
            });
            console.log('Admin user created successfully.');
        } else {
            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash('abc123def', salt);

            existingUser.passwordHash = passwordHash;
            existingUser.role = 'MANAGER'; // Ensure role is correct too
            await existingUser.save();
            console.log('Admin user updated successfully.');
        }
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

seed();

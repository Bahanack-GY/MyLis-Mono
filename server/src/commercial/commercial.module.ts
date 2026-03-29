import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Lead } from '../models/lead.model';
import { LeadActivity } from '../models/lead-activity.model';
import { LeadContact } from '../models/lead-contact.model';
import { LeadNeed } from '../models/lead-need.model';
import { DepartmentService } from '../models/department-service.model';
import { ClientPayment } from '../models/client-payment.model';
import { CommercialGoal } from '../models/commercial-goal.model';
import { Invoice } from '../models/invoice.model';
import { InvoiceItem } from '../models/invoice-item.model';
import { Client } from '../models/client.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadActivitiesController } from './lead-activities.controller';
import { LeadActivitiesService } from './lead-activities.service';
import { ClientPaymentsController } from './client-payments.controller';
import { ClientPaymentsService } from './client-payments.service';
import { CommercialGoalsController } from './commercial-goals.controller';
import { CommercialGoalsService } from './commercial-goals.service';
import { ClientFollowUpRemindersService } from './client-followup-reminders.service';
import { PaymentRemindersService } from './payment-reminders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        SequelizeModule.forFeature([
            Lead,
            LeadActivity,
            LeadContact,
            LeadNeed,
            DepartmentService,
            ClientPayment,
            CommercialGoal,
            Invoice,
            InvoiceItem,
            Client,
            Employee,
            User,
            Department,
        ]),
        NotificationsModule,
    ],
    controllers: [LeadsController, LeadActivitiesController, ClientPaymentsController, CommercialGoalsController],
    providers: [
        LeadsService,
        LeadActivitiesService,
        ClientPaymentsService,
        CommercialGoalsService,
        ClientFollowUpRemindersService,
        PaymentRemindersService,
    ],
    exports: [LeadsService, LeadActivitiesService, ClientPaymentsService, CommercialGoalsService],
})
export class CommercialModule { }

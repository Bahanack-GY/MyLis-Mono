
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailService } from './mail.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
    imports: [SequelizeModule.forFeature([Notification, User, Employee]), WhatsAppModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, MailService],
    exports: [NotificationsService],
})
export class NotificationsModule { }

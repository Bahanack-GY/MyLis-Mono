
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MulterModule } from '@nestjs/platform-express';
import { Meeting } from '../models/meeting.model';
import { MeetingParticipant } from '../models/meeting-participant.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Meeting, MeetingParticipant, Employee, User]),
        MulterModule.register({}),
        NotificationsModule,
        WhatsAppModule,
    ],
    controllers: [MeetingsController],
    providers: [MeetingsService],
    exports: [MeetingsService],
})
export class MeetingsModule { }

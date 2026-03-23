
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Meeting } from '../models/meeting.model';
import { MeetingParticipant } from '../models/meeting-participant.model';
import { Employee } from '../models/employee.model';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [SequelizeModule.forFeature([Meeting, MeetingParticipant, Employee]), NotificationsModule],
    controllers: [MeetingsController],
    providers: [MeetingsService],
    exports: [MeetingsService],
})
export class MeetingsModule { }

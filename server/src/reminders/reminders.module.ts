import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Reminder } from '../models/reminder.model';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
    imports: [
        SequelizeModule.forFeature([Reminder]),
        NotificationsModule,
    ],
    controllers: [RemindersController],
    providers: [RemindersService],
})
export class RemindersModule {}

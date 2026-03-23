import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Channel } from '../models/channel.model';
import { Message } from '../models/message.model';
import { ChannelMember } from '../models/channel-member.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        SequelizeModule.forFeature([
            Channel,
            Message,
            ChannelMember,
            User,
            Employee,
            Department,
        ]),
    ],
    providers: [ChatService, ChatGateway],
    controllers: [ChatController],
    exports: [ChatService],
})
export class ChatModule {}

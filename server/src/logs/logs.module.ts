
import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Log } from '../models/log.model';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';

@Global()
@Module({
    imports: [SequelizeModule.forFeature([Log])],
    controllers: [LogsController],
    providers: [LogsService],
    exports: [LogsService],
})
export class LogsModule { }

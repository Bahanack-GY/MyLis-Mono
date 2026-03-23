import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TaskNature } from '../models/task-nature.model';
import { TaskNaturesService } from './task-natures.service';
import { TaskNaturesController } from './task-natures.controller';

@Module({
    imports: [SequelizeModule.forFeature([TaskNature])],
    controllers: [TaskNaturesController],
    providers: [TaskNaturesService],
    exports: [TaskNaturesService],
})
export class TaskNaturesModule {}

import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChargeNatureConfig } from '../models/charge-nature-config.model';
import { ChargeNaturesService } from './charge-natures.service';
import { ChargeNaturesController } from './charge-natures.controller';

@Module({
    imports: [SequelizeModule.forFeature([ChargeNatureConfig])],
    providers: [ChargeNaturesService],
    controllers: [ChargeNaturesController],
    exports: [ChargeNaturesService],
})
export class ChargeNaturesModule {}

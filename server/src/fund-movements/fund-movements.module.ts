import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { FundMovement } from '../models/fund-movement.model';
import { Employee } from '../models/employee.model';
import { FundMovementsService } from './fund-movements.service';
import { FundMovementsController } from './fund-movements.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [
        SequelizeModule.forFeature([FundMovement, Employee]),
        AccountingModule,
    ],
    controllers: [FundMovementsController],
    providers: [FundMovementsService],
    exports: [FundMovementsService],
})
export class FundMovementsModule {}

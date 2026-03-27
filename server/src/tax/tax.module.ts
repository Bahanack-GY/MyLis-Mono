import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TaxConfig } from '../models/tax-config.model';
import { TaxDeclaration } from '../models/tax-declaration.model';
import { Invoice } from '../models/invoice.model';
import { TaxConfigController } from './tax-config.controller';
import { TaxConfigService } from './tax-config.service';
import { TaxDeclarationsController } from './tax-declarations.controller';
import { TaxDeclarationsService } from './tax-declarations.service';
import { TvaService } from './tva.service';
import { IsService } from './is.service';
import { AccountingModule } from '../accounting/accounting.module';
import { PayrollModule } from '../payroll/payroll.module';

@Module({
    imports: [
        SequelizeModule.forFeature([TaxConfig, TaxDeclaration, Invoice]),
        AccountingModule,
        PayrollModule,
    ],
    controllers: [TaxConfigController, TaxDeclarationsController],
    providers: [TaxConfigService, TaxDeclarationsService, TvaService, IsService],
    exports: [TaxDeclarationsService, TvaService, IsService],
})
export class TaxModule {}

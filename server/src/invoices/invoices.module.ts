import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Invoice } from '../models/invoice.model';
import { InvoiceItem } from '../models/invoice-item.model';
import { InvoiceTemplate } from '../models/invoice-template.model';
import { InvoicesService } from './invoices.service';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { InvoicesController } from './invoices.controller';
import { OrganizationModule } from '../organization/organization.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Invoice, InvoiceItem, InvoiceTemplate]),
        OrganizationModule,
        AccountingModule,
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoiceTemplatesService],
    exports: [InvoicesService, InvoiceTemplatesService],
})
export class InvoicesModule { }

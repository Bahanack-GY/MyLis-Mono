import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Supplier } from '../models/supplier.model';
import { SupplierInvoice } from '../models/supplier-invoice.model';
import { SupplierInvoiceItem } from '../models/supplier-invoice-item.model';
import { Department } from '../models/department.model';
import { User } from '../models/user.model';
import { AccountingModule } from '../accounting/accounting.module';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';

@Module({
    imports: [
        SequelizeModule.forFeature([Supplier, SupplierInvoice, SupplierInvoiceItem, Department, User]),
        AccountingModule,
    ],
    controllers: [SuppliersController],
    providers: [SuppliersService],
})
export class SuppliersModule {}

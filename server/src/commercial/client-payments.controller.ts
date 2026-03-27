import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientPaymentsService } from './client-payments.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('client-payments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT', 'COMMERCIAL')
export class ClientPaymentsController {
    constructor(private readonly paymentsService: ClientPaymentsService) { }

    @Post()
    create(@Body() dto: any) {
        return this.paymentsService.create(dto);
    }

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('clientId') clientId?: string,
        @Query('invoiceId') invoiceId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.paymentsService.findAll({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            clientId,
            invoiceId,
            dateFrom,
            dateTo,
        });
    }

    @Get('sales-summary')
    getSalesSummary() {
        return this.paymentsService.getSalesSummary();
    }

    @Get('client-statement/:clientId')
    getClientStatement(@Param('clientId') clientId: string) {
        return this.paymentsService.getClientStatement(clientId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.paymentsService.findOne(id);
    }

    @Roles('MANAGER', 'ACCOUNTANT')
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.paymentsService.update(id, dto);
    }

    @Roles('MANAGER')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.paymentsService.remove(id);
    }
}

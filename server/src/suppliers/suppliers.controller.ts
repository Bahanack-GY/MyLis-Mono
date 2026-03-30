import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class SuppliersController {
    constructor(private readonly service: SuppliersService) {}

    /* ─── Suppliers ─── */

    @Get()
    findAll() {
        return this.service.findAllSuppliers();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findSupplier(id);
    }

    @Post()
    create(@Body() dto: any) {
        return this.service.createSupplier(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateSupplier(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.deleteSupplier(id);
    }

    /* ─── Invoices ─── */

    @Get('invoices/list')
    findAllInvoices(
        @Query('supplierId') supplierId?: string,
        @Query('status') status?: string,
        @Query('departmentId') departmentId?: string,
    ) {
        return this.service.findAllInvoices(supplierId, status, departmentId);
    }

    @Get('invoices/stats')
    getStats(@Query('departmentId') departmentId?: string) {
        return this.service.getStats(departmentId);
    }

    @Get('invoices/:id')
    findInvoice(@Param('id') id: string) {
        return this.service.findInvoice(id);
    }

    @Post('invoices')
    createInvoice(@Body() dto: any, @Request() req: any) {
        return this.service.createInvoice(dto, req.user.userId);
    }

    @Patch('invoices/:id')
    updateInvoice(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.service.updateInvoice(id, dto, req.user.userId);
    }

    @Post('invoices/:id/validate')
    validateInvoice(@Param('id') id: string, @Request() req: any) {
        return this.service.validateInvoice(id, req.user.userId);
    }

    @Post('invoices/:id/pay')
    payInvoice(@Param('id') id: string, @Body() body: { paidAt?: string }, @Request() req: any) {
        const paidAt = body.paidAt || new Date().toISOString().split('T')[0];
        return this.service.payInvoice(id, paidAt, req.user.userId);
    }

    @Post('invoices/:id/cancel')
    cancelInvoice(@Param('id') id: string) {
        return this.service.cancelInvoice(id);
    }
}

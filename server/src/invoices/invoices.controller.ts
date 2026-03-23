import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
@Controller('invoices')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly invoiceTemplatesService: InvoiceTemplatesService,
    ) { }

    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.invoicesService.create(dto, req.user.userId);
    }

    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return this.invoicesService.findAll(deptId);
    }

    @Get('stats')
    getStats(@Query('departmentId') departmentId: string, @Query('from') from: string, @Query('to') to: string, @Request() req) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return this.invoicesService.getStats(deptId, from, to);
    }

    @Get('revenue-by-department')
    getRevenueByDepartment(@Query('from') from: string, @Query('to') to: string) {
        return this.invoicesService.getRevenueByDepartment(from, to);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }

    @Patch(':id/send')
    send(@Param('id') id: string) {
        return this.invoicesService.send(id);
    }

    @Patch(':id/pay')
    markPaid(@Param('id') id: string) {
        return this.invoicesService.markPaid(id);
    }

    @Patch(':id/reject')
    reject(@Param('id') id: string) {
        return this.invoicesService.reject(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.invoicesService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.invoicesService.remove(id);
    }

    // ─── Templates ─────────────────────────────────────────
    @Get('templates/department/:deptId')
    getTemplate(@Param('deptId') deptId: string) {
        return this.invoiceTemplatesService.findByDepartment(deptId);
    }

    @Patch('templates/department/:deptId')
    upsertTemplate(@Param('deptId') deptId: string, @Body() dto: any) {
        return this.invoiceTemplatesService.upsert(deptId, dto);
    }
}

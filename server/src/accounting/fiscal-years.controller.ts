import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FiscalYearsService } from './fiscal-years.service';

@Controller('accounting/fiscal-years')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class FiscalYearsController {
    constructor(private readonly fiscalYearsService: FiscalYearsService) {}

    @Get()
    findAll() {
        return this.fiscalYearsService.findAll();
    }

    @Get('open')
    findOpen() {
        return this.fiscalYearsService.findOpenYear();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.fiscalYearsService.findOne(id);
    }

    @Post()
    create(@Body() dto: any) {
        return this.fiscalYearsService.create(dto);
    }

    @Post(':id/close')
    close(@Param('id') id: string, @Request() req: any) {
        return this.fiscalYearsService.close(id, req.user.userId);
    }

    @Post(':id/reopen')
    reopen(@Param('id') id: string) {
        return this.fiscalYearsService.reopen(id);
    }
}

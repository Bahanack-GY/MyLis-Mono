import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FiscalYearsService } from './fiscal-years.service';
import { JournalEngineService } from './journal-engine.service';

@Controller('accounting/fiscal-years')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class FiscalYearsController {
    constructor(
        private readonly fiscalYearsService: FiscalYearsService,
        private readonly journalEngine: JournalEngineService,
    ) {}

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

    @Patch(':id/tax-config')
    updateTaxConfig(@Param('id') id: string, @Body() dto: any) {
        return this.fiscalYearsService.updateTaxConfig(id, dto.taxConfig ?? dto);
    }

    @Get(':id/opening-balances')
    getOpeningBalances(@Param('id') id: string) {
        return this.journalEngine.getOpeningBalances(id);
    }

    @Post(':id/opening-balances')
    async importOpeningBalances(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        const fy = await this.fiscalYearsService.findOne(id);
        return this.journalEngine.importOpeningBalances({
            fiscalYearId: id,
            startDate: fy.startDate,
            balances: dto.balances ?? [],
            userId: req.user.userId,
        });
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

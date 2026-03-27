import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BudgetsService } from './budgets.service';

@Controller('accounting/budgets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class BudgetsController {
    constructor(private readonly budgetsService: BudgetsService) {}

    @Get()
    findAll(@Query('fiscalYearId') fiscalYearId: string) {
        return this.budgetsService.findAll(fiscalYearId);
    }

    @Get('variance')
    variance(@Query('fiscalYearId') fiscalYearId: string) {
        return this.budgetsService.variance(fiscalYearId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.budgetsService.findOne(id);
    }

    @Post()
    create(@Body() dto: any) {
        return this.budgetsService.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.budgetsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.budgetsService.remove(id);
    }
}

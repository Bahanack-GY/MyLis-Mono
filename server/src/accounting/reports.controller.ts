import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportsService } from './reports.service';

@Controller('accounting/reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('grand-livre/:fiscalYearId')
    grandLivre(
        @Param('fiscalYearId') fiscalYearId: string,
        @Query('accountId') accountId?: string,
    ) {
        return this.reportsService.grandLivre(fiscalYearId, accountId);
    }

    @Get('trial-balance/:fiscalYearId')
    trialBalance(@Param('fiscalYearId') fiscalYearId: string) {
        return this.reportsService.trialBalance(fiscalYearId);
    }

    @Get('balance-sheet/:fiscalYearId')
    balanceSheet(@Param('fiscalYearId') fiscalYearId: string) {
        return this.reportsService.balanceSheet(fiscalYearId);
    }

    @Get('income-statement/:fiscalYearId')
    incomeStatement(@Param('fiscalYearId') fiscalYearId: string) {
        return this.reportsService.incomeStatement(fiscalYearId);
    }

    @Get('dashboard-kpis/:fiscalYearId')
    dashboardKpis(@Param('fiscalYearId') fiscalYearId: string) {
        return this.reportsService.dashboardKpis(fiscalYearId);
    }

    @Get('monthly-summary/:fiscalYearId')
    monthlySummary(@Param('fiscalYearId') fiscalYearId: string) {
        return this.reportsService.monthlySummary(fiscalYearId);
    }

    @Get('cash-flow/:fiscalYearId')
    cashFlow(@Param('fiscalYearId') fiscalYearId: string) {
        return this.reportsService.cashFlow(fiscalYearId);
    }
}

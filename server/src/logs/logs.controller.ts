
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LogsController {
    constructor(private readonly logsService: LogsService) { }

    @Get('stats')
    getStats(@Query('from') from?: string, @Query('to') to?: string) {
        return this.logsService.getStats(from, to);
    }

    @Get()
    findAll(
        @Query('action') action?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.logsService.findAll(
            action, from, to,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 10,
        );
    }
}

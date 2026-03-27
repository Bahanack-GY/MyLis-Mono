import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JournalEntriesService } from './journal-entries.service';

@Controller('accounting/entries')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class JournalEntriesController {
    constructor(private readonly entriesService: JournalEntriesService) {}

    @Get()
    findAll(
        @Query('journalId') journalId?: string,
        @Query('fiscalYearId') fiscalYearId?: string,
        @Query('status') status?: string,
        @Query('sourceType') sourceType?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.entriesService.findAll({ journalId, fiscalYearId, status, sourceType, from, to });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.entriesService.findOne(id);
    }

    @Post()
    create(@Body() dto: any, @Request() req: any) {
        return this.entriesService.create(dto, req.user.userId);
    }

    @Post(':id/validate')
    validate(@Param('id') id: string, @Request() req: any) {
        return this.entriesService.validate(id, req.user.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.entriesService.remove(id);
    }
}

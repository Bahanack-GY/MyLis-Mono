import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.leadsService.create(dto, req.user);
    }

    @Get()
    findAll(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('saleStage') saleStage?: string,
        @Query('leadStatus') leadStatus?: string,
        @Query('priority') priority?: string,
        @Query('leadType') leadType?: string,
        @Query('assignedToId') assignedToId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.leadsService.findAll({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
            saleStage,
            leadStatus,
            priority,
            leadType,
            assignedToId,
            dateFrom,
            dateTo,
        }, req.user);
    }

    @Get('stats')
    getStats(
        @Request() req,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('assignedToId') assignedToId?: string,
    ) {
        return this.leadsService.getStats({ dateFrom, dateTo, assignedToId }, req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leadsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.leadsService.update(id, dto);
    }

    @Roles('MANAGER')
    @Patch(':id/convert')
    convert(@Param('id') id: string, @Body() dto: any) {
        return this.leadsService.convertToClient(id, dto);
    }

    @Roles('MANAGER')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.leadsService.remove(id);
    }
}

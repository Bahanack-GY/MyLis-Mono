import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LeadActivitiesService } from './lead-activities.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('lead-activities')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL')
export class LeadActivitiesController {
    constructor(private readonly activitiesService: LeadActivitiesService) { }

    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.activitiesService.create(dto, req.user);
    }

    @Get()
    findAll(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('leadId') leadId?: string,
        @Query('clientId') clientId?: string,
        @Query('employeeId') employeeId?: string,
        @Query('type') type?: string,
        @Query('activityStatus') activityStatus?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.activitiesService.findAll({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            leadId,
            clientId,
            employeeId,
            type,
            activityStatus,
            dateFrom,
            dateTo,
        }, req.user);
    }

    @Get('kpis')
    getKpis(
        @Request() req,
        @Query('employeeId') employeeId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.activitiesService.getKpis({ employeeId, dateFrom, dateTo }, req.user);
    }

    @Get('client/:clientId/report')
    @Roles('COMMERCIAL', 'MANAGER', 'HEAD_OF_DEPARTMENT')
    getClientActivitiesReport(
        @Param('clientId') clientId: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.activitiesService.getClientActivitiesReport(clientId, { dateFrom, dateTo });
    }

    @Get('client/:clientId/health')
    @Roles('COMMERCIAL', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    getClientHealthMetrics(@Param('clientId') clientId: string) {
        return this.activitiesService.getClientHealthMetrics(clientId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.activitiesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.activitiesService.update(id, dto);
    }

    @Roles('MANAGER')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.activitiesService.remove(id);
    }
}

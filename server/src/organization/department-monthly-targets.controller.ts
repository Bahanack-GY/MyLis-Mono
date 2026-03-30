import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DepartmentMonthlyTargetsService } from './department-monthly-targets.service';

@Controller('organization/department-monthly-targets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DepartmentMonthlyTargetsController {
    constructor(private readonly service: DepartmentMonthlyTargetsService) {}

    /** POST body: { departmentId, year, month, targetRevenue } */
    @Roles('MANAGER')
    @Post()
    upsert(@Body() dto: { departmentId: string; year: number; month: number; targetRevenue: number }) {
        return this.service.upsert(dto);
    }

    /** GET /organization/department-monthly-targets/:departmentId/stats?year=2025 */
    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get(':departmentId/stats')
    getMonthlyStats(
        @Param('departmentId') departmentId: string,
        @Query('year') year: string,
    ) {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.service.getMonthlyStats(departmentId, y);
    }

    /** GET /organization/department-monthly-targets/:departmentId?year=2025 */
    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get(':departmentId')
    getByDepartmentAndYear(
        @Param('departmentId') departmentId: string,
        @Query('year') year: string,
    ) {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.service.getByDepartmentAndYear(departmentId, y);
    }
}

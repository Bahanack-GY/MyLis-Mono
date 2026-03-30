
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, BadRequestException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { MonthlyRankingsService } from './monthly-rankings.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('employees')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EmployeesController {
    constructor(
        private readonly employeesService: EmployeesService,
        private readonly monthlyRankingsService: MonthlyRankingsService,
    ) { }

    @Post()
    create(@Body() createEmployeeDto: any, @Request() req) {
        if (req.user.role === 'HEAD_OF_DEPARTMENT') {
            createEmployeeDto.departmentId = req.user.departmentId;
        }
        return this.employeesService.create(createEmployeeDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT', 'COMMERCIAL')
    @Get()
    findAll(
        @Query('departmentId') departmentId: string,
        @Query('search') search: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('dismissed') dismissed: string,
        @Request() req,
    ) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        if (page && limit) {
            return this.employeesService.findAllPaginated({
                departmentId: deptId,
                search,
                dismissed: dismissed === 'true',
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            });
        }
        return this.employeesService.findAll(deptId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get('leaderboard')
    getLeaderboard(@Query('limit') limit?: string) {
        return this.employeesService.getLeaderboard(limit ? parseInt(limit, 10) : 5);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get('birthdays/today')
    getTodayBirthdays() {
        return this.employeesService.getTodayBirthdays();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Get(':id/stats')
    getStats(@Param('id') id: string) {
        return this.employeesService.getEmployeeStats(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Get(':id/badges')
    getBadges(@Param('id') id: string) {
        return this.employeesService.getEmployeeBadges(id);
    }

    @Patch(':id/password')
    async changePassword(@Param('id') id: string, @Body('password') password: string) {
        if (!password || password.length < 6) throw new BadRequestException('Password must be at least 6 characters');
        await this.employeesService.changeEmployeePassword(id, password);
        return { message: 'Password updated successfully' };
    }

    @Patch(':id/dismiss')
    dismiss(@Param('id') id: string) {
        return this.employeesService.dismiss(id);
    }

    @Patch(':id/reinstate')
    reinstate(@Param('id') id: string) {
        return this.employeesService.reinstate(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.employeesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEmployeeDto: any) {
        return this.employeesService.update(id, updateEmployeeDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.employeesService.remove(id);
    }

    @Patch(':id/transfer')
    async transferDepartment(
        @Param('id') id: string,
        @Body() dto: { toDepartmentId: string; reason?: string },
        @Request() req
    ) {
        return this.employeesService.transferDepartment(
            id,
            dto.toDepartmentId,
            req.user.userId,
            dto.reason
        );
    }

    @Get(':id/transfer-history')
    getTransferHistory(@Param('id') id: string) {
        return this.employeesService.getTransferHistory(id);
    }

    @Roles('MANAGER')
    @Patch(':id/promote')
    async promote(
        @Param('id') id: string,
        @Body() dto: { toRole: string; reason?: string },
        @Request() req,
    ) {
        return this.employeesService.promoteEmployee(id, dto.toRole, req.user.userId, dto.reason);
    }

    @Get(':id/promotion-history')
    getPromotionHistory(@Param('id') id: string) {
        return this.employeesService.getPromotionHistory(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Get(':id/reports')
    getEmployeeReports(@Param('id') id: string, @Request() req) {
        return this.employeesService.getEmployeeReports(id, req.user.role, req.user.departmentId);
    }

    // ── Monthly Rankings ──────────────────────────────────────────────────

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get('rankings/years')
    getRankingYears() {
        return this.monthlyRankingsService.getAvailableYears();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get('rankings/monthly')
    getMonthlyRankings(@Query('year') year?: string) {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.monthlyRankingsService.getMonthlyRankings(y);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get('rankings/yearly')
    getYearlyRanking(@Query('year') year?: string) {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.monthlyRankingsService.getYearlyRanking(y);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Post('rankings/snapshot')
    triggerSnapshot(@Body() body: { year?: number; month?: number }) {
        const now = new Date();
        const y = body.year || now.getFullYear();
        const m = body.month || now.getMonth() + 1;
        return this.monthlyRankingsService.snapshotMonthlyRankings(y, m);
    }
}

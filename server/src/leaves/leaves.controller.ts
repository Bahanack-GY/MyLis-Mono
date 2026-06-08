
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LeavesService } from './leaves.service';

@Controller('leaves')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) {}

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE', 'RH')
    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.leavesService.create(dto, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Get()
    findAll(@Query('status') status?: string, @Query('employeeId') employeeId?: string) {
        return this.leavesService.findAll({ status, employeeId });
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE', 'RH')
    @Get('my')
    findMy(@Request() req) {
        return this.leavesService.findMyRequests(req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE', 'RH')
    @Get('my/balance')
    getMyBalance(@Request() req, @Query('year') year?: string) {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.leavesService.getMyBalance(req.user.userId, y);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Get('balance/:employeeId')
    getBalance(@Param('employeeId') employeeId: string, @Query('year') year?: string) {
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.leavesService.getBalance(employeeId, y);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Patch('balance/:employeeId')
    updateBalance(
        @Param('employeeId') employeeId: string,
        @Body() dto: { year: number; totalDays: number },
    ) {
        return this.leavesService.updateBalance(employeeId, dto.year, dto.totalDays);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Patch(':id/approve')
    approve(@Param('id') id: string, @Request() req) {
        return this.leavesService.approve(id, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Patch(':id/reject')
    reject(@Param('id') id: string, @Body('rejectionReason') rejectionReason: string, @Request() req) {
        return this.leavesService.reject(id, req.user.userId, rejectionReason || 'Motif non précisé');
    }
}

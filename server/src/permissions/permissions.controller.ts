
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE', 'RH')
    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.permissionsService.create(dto, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Get()
    findAll(@Query('status') status?: string, @Query('employeeId') employeeId?: string) {
        return this.permissionsService.findAll({ status, employeeId });
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE', 'RH')
    @Get('my')
    findMy(@Request() req) {
        return this.permissionsService.findMyRequests(req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Patch(':id/approve')
    approve(@Param('id') id: string, @Request() req) {
        return this.permissionsService.approve(id, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'RH')
    @Patch(':id/reject')
    reject(@Param('id') id: string, @Body('rejectionReason') rejectionReason: string, @Request() req) {
        return this.permissionsService.reject(id, req.user.userId, rejectionReason || 'Motif non précisé');
    }
}

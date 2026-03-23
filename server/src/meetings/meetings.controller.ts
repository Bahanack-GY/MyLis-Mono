
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('meetings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MeetingsController {
    constructor(private readonly meetingsService: MeetingsService) { }

    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.meetingsService.create(dto, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req) {
        if (req.user.role === 'EMPLOYEE') {
            return this.meetingsService.findByUserId(req.user.userId);
        }
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return this.meetingsService.findAll(deptId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.meetingsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.meetingsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.meetingsService.remove(id);
    }
}

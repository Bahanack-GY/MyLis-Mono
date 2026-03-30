import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EmployeeTasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Get('weekly-check')
    weeklyCheck(@Request() req) {
        return this.tasksService.weeklyCheckForUser(req.user.userId);
    }

    @Get('my-week')
    findMyWeek(@Query('start') start: string, @Request() req) {
        return this.tasksService.findMyWeek(req.user.userId, new Date(start));
    }

    @Post('self-assign')
    selfAssign(@Body() dto: any, @Request() req) {
        return this.tasksService.selfAssign(req.user.userId, dto);
    }

    @Patch('update-state/:id')
    updateState(@Param('id') id: string, @Body('state') state: string, @Body('blockReason') blockReason: string, @Request() req) {
        return this.tasksService.updateStateForUser(id, req.user.userId, state, blockReason);
    }

    @Post('transfer/:taskId')
    transferTask(@Param('taskId') taskId: string, @Body() dto: { targetWeekStart: string }, @Request() req) {
        return this.tasksService.transferToWeek(taskId, req.user.userId, dto.targetWeekStart);
    }
}

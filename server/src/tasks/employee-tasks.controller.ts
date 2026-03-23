import { Controller, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EmployeeTasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Post('self-assign')
    selfAssign(@Body() dto: any, @Request() req) {
        return this.tasksService.selfAssign(req.user.userId, dto);
    }

    @Patch('update-state/:id')
    updateState(@Param('id') id: string, @Body('state') state: string, @Body('blockReason') blockReason: string, @Request() req) {
        return this.tasksService.updateStateForUser(id, req.user.userId, state, blockReason);
    }
}

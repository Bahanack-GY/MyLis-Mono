
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(@Body() createTaskDto: any, @Request() req) {
        return this.tasksService.create(createTaskDto, req.user.userId);
    }

    @Get()
    findAll(@Query('departmentId') departmentId: string, @Query('from') from: string, @Query('to') to: string, @Request() req) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return this.tasksService.findAll(deptId, from, to);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
    @Get('my-tasks')
    findMyTasks(@Request() req) {
        return this.tasksService.findByUserId(req.user.userId);
    }

    @Get('project/:projectId')
    findByProject(@Param('projectId') projectId: string) {
        return this.tasksService.findByProject(projectId);
    }

    @Get('employee/:employeeId')
    findByEmployee(@Param('employeeId') employeeId: string) {
        return this.tasksService.findByEmployee(employeeId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tasksService.findOne(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTaskDto: any, @Request() req) {
        return this.tasksService.updateByUser(id, req.user.userId, req.user.role, updateTaskDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.tasksService.removeByUser(id, req.user.userId, req.user.role);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get(':id/history')
    getHistory(@Param('id') id: string) {
        return this.tasksService.getHistory(id);
    }
}

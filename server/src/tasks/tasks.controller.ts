
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

    @Get('week')
    findWeek(
        @Query('start') start: string,
        @Query('employeeId') employeeId: string,
        @Request() req
    ) {
        const weekStartDate = new Date(start);
        if (employeeId) {
            return this.tasksService.findByWeek(employeeId, weekStartDate);
        }
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : undefined;
        return this.tasksService.findWeekForAllEmployees(deptId, weekStartDate);
    }

    @Get('weekly-check/:employeeId')
    weeklyCheckForEmployee(@Param('employeeId') employeeId: string) {
        return this.tasksService.checkWeeklyCompliance(employeeId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Post(':taskId/subtasks')
    createSubtask(@Param('taskId') taskId: string, @Body('title') title: string) {
        return this.tasksService.createSubtask(taskId, title);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get(':taskId/subtasks')
    getSubtasks(@Param('taskId') taskId: string) {
        return this.tasksService.getSubtasks(taskId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Patch('subtasks/:id')
    updateSubtask(@Param('id') id: string, @Body() dto: { title?: string; completed?: boolean; order?: number }) {
        return this.tasksService.updateSubtask(id, dto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Patch('subtasks/:id/toggle')
    toggleSubtask(@Param('id') id: string) {
        return this.tasksService.toggleSubtask(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Patch(':taskId/subtasks/reorder')
    reorderSubtasks(@Param('taskId') taskId: string, @Body('subtaskIds') subtaskIds: string[]) {
        return this.tasksService.reorderSubtasks(taskId, subtaskIds);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Delete('subtasks/:id')
    deleteSubtask(@Param('id') id: string) {
        return this.tasksService.deleteSubtask(id);
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

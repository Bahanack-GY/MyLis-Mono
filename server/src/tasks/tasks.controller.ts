
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { TasksService } from './tasks.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
    findAll(
        @Query('departmentId') departmentId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('states') states: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('employeeId') employeeId: string,
        @Query('boardFrom') boardFrom: string,
        @Query('boardTo') boardTo: string,
        @Request() req,
    ) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        if (page && limit) {
            return this.tasksService.findAllPaginated({
                departmentId: deptId,
                employeeId,
                states: states ? states.split(',') : undefined,
                boardFrom,
                boardTo,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            });
        }
        return this.tasksService.findAll(deptId, from, to);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
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

    @Get('stats/distribution')
    getGlobalDistribution(
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.tasksService.getGlobalDistribution(from, to);
    }

    @Get('employee/:employeeId/time-distribution')
    getTimeDistribution(@Param('employeeId') employeeId: string) {
        return this.tasksService.getTimeDistribution(employeeId);
    }

    @Get('employee/:employeeId/daily-hours')
    getDailyHours(
        @Param('employeeId') employeeId: string,
        @Query('dateFrom') dateFrom: string,
        @Query('dateTo') dateTo: string,
    ) {
        return this.tasksService.getDailyHours(employeeId, dateFrom, dateTo);
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

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL')
    @Get('lead/:leadId')
    findByLead(@Param('leadId') leadId: string) {
        return this.tasksService.findByLead(leadId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Post(':taskId/attachments')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const uploadPath = join(process.cwd(), 'uploads', 'tasks');
                mkdirSync(uploadPath, { recursive: true });
                cb(null, uploadPath);
            },
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
        limits: { fileSize: MAX_FILE_SIZE },
    }))
    uploadAttachment(@Param('taskId') taskId: string, @UploadedFile() file: Express.Multer.File, @Request() req) {
        if (!file) throw new BadRequestException('No file provided');
        return this.tasksService.addAttachment(taskId, {
            fileName: file.originalname,
            filePath: '/uploads/tasks/' + file.filename,
            fileType: file.mimetype,
            size: file.size,
        }, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Delete(':taskId/attachments/:attachmentId')
    removeAttachment(@Param('taskId') taskId: string, @Param('attachmentId') attachmentId: string) {
        return this.tasksService.removeAttachment(taskId, attachmentId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Post(':taskId/subtasks')
    createSubtask(@Param('taskId') taskId: string, @Body('title') title: string) {
        return this.tasksService.createSubtask(taskId, title);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get(':taskId/subtasks')
    getSubtasks(@Param('taskId') taskId: string) {
        return this.tasksService.getSubtasks(taskId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Patch('subtasks/:id')
    updateSubtask(@Param('id') id: string, @Body() dto: { title?: string; completed?: boolean; order?: number }) {
        return this.tasksService.updateSubtask(id, dto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Patch('subtasks/:id/toggle')
    toggleSubtask(@Param('id') id: string, @Request() req) {
        return this.tasksService.toggleSubtask(id, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Patch(':taskId/subtasks/reorder')
    reorderSubtasks(@Param('taskId') taskId: string, @Body('subtaskIds') subtaskIds: string[]) {
        return this.tasksService.reorderSubtasks(taskId, subtaskIds);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Delete('subtasks/:id')
    deleteSubtask(@Param('id') id: string) {
        return this.tasksService.deleteSubtask(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tasksService.findOne(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTaskDto: any, @Request() req) {
        return this.tasksService.updateByUser(id, req.user.userId, req.user.role, updateTaskDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.tasksService.removeByUser(id, req.user.userId, req.user.role);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
    @Get(':id/history')
    getHistory(@Param('id') id: string) {
        return this.tasksService.getHistory(id);
    }
}

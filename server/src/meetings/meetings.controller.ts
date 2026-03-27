
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MeetingsService } from './meetings.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const ALL_ROLES = ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL', 'ACCOUNTANT'];

// Ensure upload directory exists
const uploadDir = '/tmp/recordings';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

@Controller('meetings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MeetingsController {
    constructor(private readonly meetingsService: MeetingsService) { }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.meetingsService.create(dto, req.user.userId);
    }

    @Roles(...ALL_ROLES)
    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req) {
        if (req.user.role === 'EMPLOYEE' || req.user.role === 'COMMERCIAL' || req.user.role === 'ACCOUNTANT') {
            return this.meetingsService.findByUserId(req.user.userId);
        }
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return this.meetingsService.findAll(deptId);
    }

    @Roles(...ALL_ROLES)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.meetingsService.findOne(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: any) {
        return this.meetingsService.update(id, dto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.meetingsService.remove(id);
    }

    @Roles(...ALL_ROLES)
    @Patch(':id/start')
    start(@Param('id') id: string, @Body() dto: any, @Request() req) {
        return this.meetingsService.startMeeting(id, dto.secretaryId, req.user.userId);
    }

    @Roles(...ALL_ROLES)
    @Patch(':id/end')
    end(@Param('id') id: string, @Request() req) {
        return this.meetingsService.endMeeting(id, req.user.userId);
    }

    @Roles(...ALL_ROLES)
    @Patch(':id/attend')
    attend(@Param('id') id: string, @Request() req) {
        return this.meetingsService.attendMeeting(id, req.user.userId);
    }

    @Roles(...ALL_ROLES)
    @Post(':id/recording')
    @UseInterceptors(FileInterceptor('audio', {
        storage: diskStorage({
            destination: uploadDir,
            filename: (_req, file, cb) => {
                const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname) || '.webm'}`;
                cb(null, uniqueName);
            },
        }),
    }))
    uploadRecording(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        return this.meetingsService.processRecording(id, file.path);
    }
}

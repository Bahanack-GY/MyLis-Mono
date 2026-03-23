
import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { DemandsService } from './demands.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

@Controller('demands')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DemandsController {
    constructor(private readonly demandsService: DemandsService) { }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const uploadPath = join(process.cwd(), 'uploads', 'demands');
                mkdirSync(uploadPath, { recursive: true });
                cb(null, uploadPath);
            },
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = extname(file.originalname);
                cb(null, `${uniqueSuffix}${ext}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const ext = extname(file.originalname).toLowerCase();
            if (ALLOWED_EXTENSIONS.includes(ext)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`File type ${ext} is not allowed`), false);
            }
        },
        limits: { fileSize: MAX_FILE_SIZE },
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file provided');
        // Return URL-relative path so frontend can use it directly
        const relativePath = '/uploads/demands/' + file.filename;
        return {
            filePath: relativePath,
            fileName: file.originalname,
            fileType: file.mimetype,
            size: file.size,
        };
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Post()
    create(@Body() createDemandDto: any, @Request() req) {
        return this.demandsService.create(createDemandDto, req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return deptId ? this.demandsService.findAll(deptId) : this.demandsService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get('my')
    findMyDemands(@Request() req) {
        return this.demandsService.findByEmployee(req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Get('stats')
    getStats(
        @Query('departmentId') departmentId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Request() req,
    ) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return this.demandsService.getStats(deptId, from, to);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.demandsService.findOne(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Patch(':id/validate')
    validate(@Param('id') id: string) {
        return this.demandsService.validate(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
    @Patch(':id/reject')
    reject(@Param('id') id: string, @Body() body: { reason?: string }) {
        return this.demandsService.reject(id, body.reason);
    }
}

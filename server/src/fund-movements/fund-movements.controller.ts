import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { FundMovementsService } from './fund-movements.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

@Roles('CEO', 'ACCOUNTANT')
@Controller('fund-movements')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FundMovementsController {
    constructor(private readonly fundMovementsService: FundMovementsService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const uploadPath = join(process.cwd(), 'uploads', 'fund-movements');
                mkdirSync(uploadPath, { recursive: true });
                cb(null, uploadPath);
            },
            filename: (_req, file, cb) => {
                const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${unique}${extname(file.originalname)}`);
            },
        }),
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (_req, file, cb) => {
            cb(null, ALLOWED_MIME.includes(file.mimetype));
        },
    }))
    uploadJustification(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file provided or unsupported type');
        return {
            filePath: '/uploads/fund-movements/' + file.filename,
            originalName: file.originalname,
        };
    }

    @Post()
    create(@Body() dto: any, @Request() req) {
        // CEO can only create for themselves; ACCOUNTANT selects ceoUserId in body
        const ceoUserId = req.user.role === 'CEO' ? req.user.userId : dto.ceoUserId;
        return this.fundMovementsService.create(
            { ...dto, ceoUserId },
            req.user.userId,
        );
    }

    @Get()
    findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('type') type: string,
        @Query('ceoUserId') ceoUserId: string,
        @Request() req,
    ) {
        // CEO only sees their own movements
        const resolvedCeoUserId = req.user.role === 'CEO' ? req.user.userId : ceoUserId;
        return this.fundMovementsService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            type: type || undefined,
            ceoUserId: resolvedCeoUserId || undefined,
        });
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.fundMovementsService.remove(id);
    }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from './expenses.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const uploadPath = join(process.cwd(), 'uploads', 'expenses');
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
            filePath: '/uploads/expenses/' + file.filename,
            originalName: file.originalname,
        };
    }

    @Post()
    create(@Body() createExpenseDto: any, @Req() req: any) {
        return this.expensesService.create(createExpenseDto, req.user?.userId);
    }

    @Get()
    findAll(
        @Query('projectId') projectId?: string,
        @Query('departmentId') departmentId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.expensesService.findAll(
            projectId,
            departmentId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
        );
    }

    @Get('stats')
    getStats(@Query('year') year?: string, @Query('departmentId') departmentId?: string) {
        return this.expensesService.getStats(year ? parseInt(year) : undefined, departmentId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.expensesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateExpenseDto: any, @Req() req: any) {
        return this.expensesService.update(id, updateExpenseDto, req.user?.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.expensesService.remove(id);
    }
}

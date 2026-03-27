import { Controller, Get, Post, Patch, Delete, Body, Param, Query,
    UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { BusinessExpensesService } from './business-expenses.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('business-expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BusinessExpensesController {
    constructor(private readonly service: BusinessExpensesService) {}

    /* ── Receipt upload ── */

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL', 'ACCOUNTANT')
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const uploadPath = join(process.cwd(), 'uploads', 'receipts');
                mkdirSync(uploadPath, { recursive: true });
                cb(null, uploadPath);
            },
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const ext = extname(file.originalname).toLowerCase();
            if (ALLOWED_EXTENSIONS.includes(ext)) cb(null, true);
            else cb(new BadRequestException(`File type ${ext} is not allowed`), false);
        },
        limits: { fileSize: MAX_FILE_SIZE },
    }))
    uploadReceipt(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file provided');
        return {
            filePath: '/uploads/receipts/' + file.filename,
            fileName: file.originalname,
            fileType: file.mimetype,
            size: file.size,
        };
    }

    /* ── Type CRUD ── */

    @Roles('MANAGER', 'ACCOUNTANT')
    @Post('types')
    createType(@Body() dto: any) {
        return this.service.createType(dto);
    }

    @Roles('MANAGER', 'ACCOUNTANT', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL')
    @Get('types')
    findAllTypes() {
        return this.service.findAllTypes();
    }

    @Roles('MANAGER', 'ACCOUNTANT')
    @Patch('types/:id')
    async updateType(@Param('id') id: string, @Body() dto: any) {
        const updated = await this.service.updateType(id, dto);
        if (!updated) throw new NotFoundException('Type not found');
        return updated;
    }

    @Roles('MANAGER', 'ACCOUNTANT')
    @Delete('types/:id')
    async removeType(@Param('id') id: string) {
        await this.service.removeType(id);
        return { success: true };
    }

    /* ── Business Expense CRUD ── */

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL')
    @Post()
    create(@Body() dto: any, @Request() req) {
        return this.service.create(dto, req.user.userId);
    }

    @Roles('MANAGER', 'ACCOUNTANT', 'HEAD_OF_DEPARTMENT')
    @Get()
    findAll(
        @Query('status') status?: string,
        @Query('typeId') typeId?: string,
        @Query('employeeId') employeeId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.service.findAll({ status, typeId, employeeId, from, to });
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL', 'ACCOUNTANT')
    @Get('my')
    findMy(@Request() req) {
        return this.service.findByEmployee(req.user.userId);
    }

    @Roles('MANAGER', 'ACCOUNTANT', 'HEAD_OF_DEPARTMENT')
    @Get('stats')
    getStats(@Query('employeeId') employeeId?: string) {
        return this.service.getStats(employeeId);
    }

    @Roles('MANAGER', 'ACCOUNTANT', 'HEAD_OF_DEPARTMENT')
    @Get('employee/:id')
    findByEmployeeId(@Param('id') id: string) {
        return this.service.findByEmployeeId(id);
    }

    @Roles('MANAGER', 'ACCOUNTANT', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Roles('ACCOUNTANT', 'MANAGER')
    @Patch(':id/validate')
    validate(@Param('id') id: string, @Request() req) {
        return this.service.validate(id, req.user.userId);
    }

    @Roles('ACCOUNTANT', 'MANAGER')
    @Patch(':id/reject')
    reject(@Param('id') id: string, @Body() body: { reason?: string }) {
        return this.service.reject(id, body.reason);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL')
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.service.remove(id, req.user.userId);
    }
}

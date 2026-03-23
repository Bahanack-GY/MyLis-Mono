
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { DocumentsService } from './documents.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const ALLOWED_FOLDERS = ['formation', 'recruitment', 'contracts', 'general', 'education'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
@Controller('hr/documents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload/:folder')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, _file, cb) => {
                const folder = String(req.params.folder || 'general');
                const safeFolderName = ALLOWED_FOLDERS.includes(folder) ? folder : 'general';
                const uploadPath = join(process.cwd(), 'uploads', safeFolderName);
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
    uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Param('folder') folder: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        if (!ALLOWED_FOLDERS.includes(folder)) {
            throw new BadRequestException(`Invalid folder: ${folder}`);
        }
        return {
            filePath: `uploads/${folder}/${file.filename}`,
            fileName: file.originalname,
            fileType: file.mimetype,
            size: file.size,
        };
    }

    @Post()
    create(@Body() createDocumentDto: any, @Request() req) {
        const dto = { ...createDocumentDto, uploadedById: req.user.userId };
        return this.documentsService.create(dto);
    }

    @Get()
    findAll(@Request() req) {
        const { role, userId, departmentId } = req.user;

        if (role === 'MANAGER') {
            return this.documentsService.findAll();
        }
        if (role === 'HEAD_OF_DEPARTMENT' && departmentId) {
            return this.documentsService.findByDepartment(departmentId);
        }
        return this.documentsService.findByUser(userId);
    }

    @Get('storage')
    getStorageInfo() {
        return this.documentsService.getStorageInfo();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.documentsService.findOne(id);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req) {
        const doc = await this.documentsService.findOne(id);
        if (!doc) throw new NotFoundException('Document not found');
        const { role, userId } = req.user;
        if (role !== 'MANAGER' && role !== 'HEAD_OF_DEPARTMENT' && doc.uploadedById !== userId) {
            throw new BadRequestException('You can only delete your own documents');
        }
        return this.documentsService.remove(id);
    }
}

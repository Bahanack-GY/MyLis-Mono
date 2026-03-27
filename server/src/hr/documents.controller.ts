
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
// Allow all common file types
const ALLOWED_EXTENSIONS = [
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages',
    // Spreadsheets
    '.xls', '.xlsx', '.csv', '.ods', '.numbers',
    // Presentations
    '.ppt', '.pptx', '.odp', '.key',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif',
    // Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    // Videos
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
    // Audio
    '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',
    // Code/Text
    '.html', '.css', '.js', '.json', '.xml', '.yaml', '.yml', '.md',
    // Others
    '.psd', '.ai', '.eps', '.indd', '.dwg', '.dxf'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL')
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
            console.log('File filter check - File:', file.originalname, 'Extension:', ext);
            if (ALLOWED_EXTENSIONS.includes(ext)) {
                cb(null, true);
            } else {
                console.error('File type not allowed:', ext, 'Allowed types:', ALLOWED_EXTENSIONS);
                cb(new BadRequestException(`File type ${ext} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
            }
        },
        limits: { fileSize: MAX_FILE_SIZE },
    }))
    uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Param('folder') folder: string,
    ) {
        console.log('Upload attempt - File:', file ? file.originalname : 'none', 'Folder:', folder);
        if (!file) {
            console.error('Upload failed: No file provided');
            throw new BadRequestException('No file provided');
        }
        if (!ALLOWED_FOLDERS.includes(folder)) {
            console.error('Upload failed: Invalid folder:', folder);
            throw new BadRequestException(`Invalid folder: ${folder}`);
        }
        console.log('Upload successful:', file.filename);
        return {
            filePath: `uploads/${folder}/${file.filename}`,
            fileName: file.originalname,
            fileType: file.mimetype,
            size: file.size,
        };
    }

    @Post()
    create(@Body() createDocumentDto: any, @Request() req) {
        const { userId, role } = req.user;

        // Employees can only create documents visible to everyone
        const dto = { ...createDocumentDto, uploadedById: userId };
        if (role === 'EMPLOYEE' || role === 'COMMERCIAL') {
            dto.visibilityType = 'EVERYONE';
            dto.allowedDepartmentIds = [];
            dto.allowedEmployeeIds = [];
        }

        return this.documentsService.create(dto);
    }

    @Get()
    async findAll(@Request() req) {
        const { role, userId, employeeId, departmentId } = req.user;
        return this.documentsService.findAccessibleDocuments(userId, role, employeeId, departmentId);
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

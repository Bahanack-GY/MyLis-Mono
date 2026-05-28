import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Request,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync, unlinkSync, existsSync } from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = ['.xls', '.xlsx'];

@Roles('CEO', 'MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AttendanceController {
    constructor(private readonly service: AttendanceService) {}

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const dest = join(process.cwd(), 'uploads', 'attendance');
                    mkdirSync(dest, { recursive: true });
                    cb(null, dest);
                },
                filename: (_req, file, cb) => {
                    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    cb(null, `${unique}${extname(file.originalname)}`);
                },
            }),
            limits: { fileSize: MAX_FILE_SIZE },
            fileFilter: (_req, file, cb) => {
                const ext = extname(file.originalname).toLowerCase();
                cb(null, ALLOWED_EXT.includes(ext));
            },
        }),
    )
    async upload(@UploadedFile() file: Express.Multer.File, @Request() req) {
        if (!file) throw new BadRequestException('Provide an .xls or .xlsx file');
        try {
            return await this.service.ingestUpload({
                filePath: file.path,
                fileName: file.originalname,
                uploadedByUserId: req.user?.userId ?? null,
            });
        } catch (e) {
            // Best-effort cleanup if parsing fails.
            if (file?.path && existsSync(file.path)) {
                try { unlinkSync(file.path); } catch { /* ignore */ }
            }
            throw e;
        }
    }

    @Get('months')
    listMonths() {
        return this.service.listMonths();
    }

    @Get(':year/:month')
    getByMonth(
        @Param('year', ParseIntPipe) year: number,
        @Param('month', ParseIntPipe) month: number,
    ) {
        return this.service.getByMonth(year, month);
    }

    @Delete(':year/:month')
    @Roles('CEO', 'MANAGER')
    deleteMonth(
        @Param('year', ParseIntPipe) year: number,
        @Param('month', ParseIntPipe) month: number,
    ) {
        return this.service.deleteMonth(year, month);
    }
}

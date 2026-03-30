import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL', 'STAGIAIRE')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @SkipThrottle()
    @Get('lock-status')
    getLockStatus() {
        return this.reportsService.getLockStatus();
    }

    @Post('generate')
    generate(@Body() dto: any, @Request() req) {
        return this.reportsService.generate(
            dto,
            req.user.userId,
            req.user.role,
            req.user.departmentId,
        );
    }

    @SkipThrottle()
    @Get()
    findAll(@Query('page') page: string, @Query('limit') limit: string, @Request() req) {
        if (page && limit) {
            return this.reportsService.findAllPaginated(
                req.user.userId,
                req.user.role,
                req.user.departmentId,
                parseInt(page, 10),
                parseInt(limit, 10),
            );
        }
        return this.reportsService.findAll(
            req.user.userId,
            req.user.role,
            req.user.departmentId,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.reportsService.findOne(
            id,
            req.user.userId,
            req.user.role,
            req.user.departmentId,
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.reportsService.remove(id, req.user.userId, req.user.role);
    }
}

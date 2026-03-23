
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SanctionsService } from './sanctions.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('hr/sanctions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SanctionsController {
    constructor(private readonly sanctionsService: SanctionsService) { }

    @Post()
    create(@Body() createSanctionDto: any, @Request() req) {
        const dto = { ...createSanctionDto, issuedByUserId: req.user.userId };
        return this.sanctionsService.create(dto);
    }

    @Get()
    findAll() {
        return this.sanctionsService.findAll();
    }

    @Roles('EMPLOYEE', 'MANAGER', 'HEAD_OF_DEPARTMENT')
    @Get('my')
    findMy(@Request() req) {
        return this.sanctionsService.findByUserId(req.user.userId);
    }

    @Get('employee/:employeeId')
    findByEmployee(@Param('employeeId') employeeId: string) {
        return this.sanctionsService.findByEmployee(employeeId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.sanctionsService.findOne(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.sanctionsService.remove(id);
    }
}

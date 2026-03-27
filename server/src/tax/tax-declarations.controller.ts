import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TaxDeclarationsService } from './tax-declarations.service';

@Controller('tax/declarations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class TaxDeclarationsController {
    constructor(private readonly declarationsService: TaxDeclarationsService) {}

    @Get()
    findAll(@Query('fiscalYearId') fiscalYearId?: string) {
        return this.declarationsService.findAll(fiscalYearId);
    }

    @Get('upcoming')
    getUpcoming() {
        return this.declarationsService.getUpcoming();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.declarationsService.findOne(id);
    }

    @Post('generate/tva')
    generateTva(@Body() dto: any) {
        return this.declarationsService.generateTva(dto.month, dto.year);
    }

    @Post('generate/is')
    generateIs(@Body() dto: any) {
        return this.declarationsService.generateIs(dto.fiscalYearId);
    }

    @Post('generate/cnps')
    generateCnps(@Body() dto: any) {
        return this.declarationsService.generateCnps(dto.month, dto.year);
    }

    @Post(':id/validate')
    validate(@Param('id') id: string, @Request() req: any) {
        return this.declarationsService.validate(id, req.user.userId);
    }

    @Post(':id/filed')
    markFiled(@Param('id') id: string) {
        return this.declarationsService.markFiled(id);
    }
}

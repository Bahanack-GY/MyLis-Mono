import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreditNotesService } from './credit-notes.service';

@Controller('accounting/credit-notes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class CreditNotesController {
    constructor(private readonly creditNotesService: CreditNotesService) {}

    @Get()
    findAll(@Query('invoiceId') invoiceId?: string) {
        return this.creditNotesService.findAll(invoiceId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.creditNotesService.findOne(id);
    }

    @Post()
    create(@Body() dto: any, @Request() req: any) {
        return this.creditNotesService.create(dto, req.user.userId);
    }

    @Post(':id/validate')
    validate(@Param('id') id: string, @Request() req: any) {
        return this.creditNotesService.validate(id, req.user.userId);
    }
}

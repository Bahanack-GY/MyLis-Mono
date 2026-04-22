import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChargeNaturesService } from './charge-natures.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('charge-natures')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ChargeNaturesController {
    constructor(private readonly service: ChargeNaturesService) {}

    @Get('families')
    getFamilies() {
        return this.service.getFamilies();
    }

    @Get()
    findAll(@Query('chargeFamily') chargeFamily?: string) {
        return this.service.findAll(chargeFamily);
    }

    @Post()
    @Roles('MANAGER', 'ACCOUNTANT')
    create(@Body() dto: { chargeFamily: string; natureName: string; syscohadaAccount: string }) {
        return this.service.create(dto);
    }

    @Patch(':id')
    @Roles('MANAGER', 'ACCOUNTANT')
    update(@Param('id') id: string, @Body() dto: { natureName?: string; syscohadaAccount?: string }) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @Roles('MANAGER', 'ACCOUNTANT')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TaxConfigService } from './tax-config.service';

@Controller('tax/config')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class TaxConfigController {
    constructor(private readonly taxConfigService: TaxConfigService) {}

    @Get()
    findAll() {
        return this.taxConfigService.findAll();
    }

    @Get(':key')
    findByKey(@Param('key') key: string) {
        return this.taxConfigService.findByKey(key);
    }

    @Post()
    upsert(@Body() dto: any) {
        return this.taxConfigService.upsert(dto);
    }

    @Post('seed')
    seed() {
        return this.taxConfigService.seed();
    }
}

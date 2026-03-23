
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { EntretiensService } from './entretiens.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('hr/entretiens')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EntretiensController {
    constructor(private readonly entretiensService: EntretiensService) { }

    @Post()
    create(@Body() createEntretienDto: any) {
        return this.entretiensService.create(createEntretienDto);
    }

    @Get()
    findAll() {
        return this.entretiensService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.entretiensService.findOne(id);
    }
}


import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FormationsService } from './formations.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
@Controller('hr/formations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FormationsController {
    constructor(private readonly formationsService: FormationsService) { }

    @Post()
    create(@Body() createFormationDto: any) {
        return this.formationsService.create(createFormationDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'COMMERCIAL', 'ACCOUNTANT', 'STAGIAIRE')
    @Get()
    findAll(@Request() req) {
        if (req.user.role === 'EMPLOYEE' || req.user.role === 'COMMERCIAL' || req.user.role === 'ACCOUNTANT' || req.user.role === 'STAGIAIRE') {
            return this.formationsService.findByUserId(req.user.userId);
        }
        return this.formationsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.formationsService.findOne(id);
    }
}

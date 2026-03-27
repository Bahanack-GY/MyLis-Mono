
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER')
@Controller('organization/teams')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Post()
    create(@Body() createTeamDto: any) {
        return this.teamsService.create(createTeamDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT', 'EMPLOYEE', 'COMMERCIAL')
    @Get()
    findAll() {
        return this.teamsService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT', 'EMPLOYEE', 'COMMERCIAL')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.teamsService.findOne(id);
    }
}

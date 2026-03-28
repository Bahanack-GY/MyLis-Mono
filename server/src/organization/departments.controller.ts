
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('organization/departments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) { }

    @Roles('MANAGER')
    @Post()
    create(@Body() createDepartmentDto: any) {
        return this.departmentsService.create(createDepartmentDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL')
    @Get()
    findAll(@Query('search') search: string, @Query('page') page: string, @Query('limit') limit: string) {
        if (page && limit) {
            return this.departmentsService.findAllPaginated({
                search,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            });
        }
        return this.departmentsService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.departmentsService.findOne(id);
    }

    @Roles('MANAGER')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDepartmentDto: any) {
        return this.departmentsService.update(id, updateDepartmentDto);
    }
}

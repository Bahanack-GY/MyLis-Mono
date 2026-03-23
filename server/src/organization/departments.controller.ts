
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
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

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
    @Get()
    findAll() {
        return this.departmentsService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
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

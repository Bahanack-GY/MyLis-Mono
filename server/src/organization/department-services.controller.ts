import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DepartmentServicesService } from './department-services.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('organization/department-services')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DepartmentServicesController {
    constructor(private readonly departmentServicesService: DepartmentServicesService) { }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Post()
    create(@Body() createDto: any) {
        return this.departmentServicesService.create(createDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Get('stats')
    getServiceStats(
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('departmentId') departmentId?: string,
    ) {
        return this.departmentServicesService.getServiceStats(from, to, departmentId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL')
    @Get()
    findAll() {
        return this.departmentServicesService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL')
    @Get('department/:departmentId')
    findByDepartment(@Param('departmentId') departmentId: string) {
        return this.departmentServicesService.findByDepartment(departmentId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT', 'COMMERCIAL')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.departmentServicesService.findOne(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: any) {
        return this.departmentServicesService.update(id, updateDto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.departmentServicesService.remove(id);
    }
}

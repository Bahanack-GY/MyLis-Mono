import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DepartmentGoalsService } from './department-goals.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER')
@Controller('organization/department-goals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DepartmentGoalsController {
    constructor(private readonly departmentGoalsService: DepartmentGoalsService) { }

    @Post()
    create(@Body() createGoalDto: any) {
        return this.departmentGoalsService.create(createGoalDto);
    }

    @Get()
    findAll() {
        return this.departmentGoalsService.findAll();
    }

    @Get('department/:departmentId')
    findByDepartment(@Param('departmentId') departmentId: string) {
        return this.departmentGoalsService.findByDepartment(departmentId);
    }

    @Get('department/:departmentId/year/:year')
    findByDepartmentAndYear(
        @Param('departmentId') departmentId: string,
        @Param('year') year: string,
    ) {
        return this.departmentGoalsService.findByDepartmentAndYear(departmentId, parseInt(year, 10));
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateGoalDto: any) {
        return this.departmentGoalsService.update(id, updateGoalDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.departmentGoalsService.remove(id);
    }
}

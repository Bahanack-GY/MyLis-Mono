import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { TaskNaturesService } from './task-natures.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('task-natures')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TaskNaturesController {
    constructor(private readonly taskNaturesService: TaskNaturesService) {}

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Post()
    create(@Body() dto: any) {
        return this.taskNaturesService.create(dto);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE', 'ACCOUNTANT')
    @Get()
    findAll() {
        return this.taskNaturesService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: any) {
        const updated = await this.taskNaturesService.update(id, dto);
        if (!updated) throw new NotFoundException('Task nature not found');
        return updated;
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        const nature = await this.taskNaturesService.findOne(id);
        if (!nature) throw new NotFoundException('Task nature not found');
        await this.taskNaturesService.remove(id);
        return { success: true };
    }
}

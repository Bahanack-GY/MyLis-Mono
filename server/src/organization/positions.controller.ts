
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER')
@Controller('organization/positions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PositionsController {
    constructor(private readonly positionsService: PositionsService) { }

    @Post()
    create(@Body() createPositionDto: any) {
        return this.positionsService.create(createPositionDto);
    }

    @Get()
    findAll() {
        return this.positionsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.positionsService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: any) {
        const updated = await this.positionsService.update(id, dto);
        if (!updated) throw new NotFoundException('Position not found');
        return updated;
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const pos = await this.positionsService.findOne(id);
        if (!pos) throw new NotFoundException('Position not found');
        await this.positionsService.remove(id);
        return { success: true };
    }
}

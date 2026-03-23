import { Controller, Get, Post, Body, Param, Delete, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from '../models/client.model';
import { Roles } from '../auth/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT')
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Post()
    create(@Body() createClientDto: any, @Request() req): Promise<Client> {
        if (req.user.role === 'HEAD_OF_DEPARTMENT' && !createClientDto.departmentId) {
            createClientDto.departmentId = req.user.departmentId;
        }
        return this.clientsService.create(createClientDto);
    }

    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req): Promise<Client[]> {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        if (deptId) {
            return this.clientsService.findByDepartment(deptId);
        }
        return this.clientsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string): Promise<Client | null> {
        return this.clientsService.findOne(id);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    @Put(':id')
    update(@Param('id') id: string, @Body() updateClientDto: any): Promise<[number, Client[]]> {
        return this.clientsService.update(id, updateClientDto);
    }

    @Roles('MANAGER')
    @Delete(':id')
    remove(@Param('id') id: string): Promise<void> {
        return this.clientsService.remove(id);
    }

    @Get('department/:departmentId')
    findByDepartment(@Param('departmentId') departmentId: string): Promise<Client[]> {
        return this.clientsService.findByDepartment(departmentId);
    }
}

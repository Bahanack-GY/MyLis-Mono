
import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TicketsService } from './tickets.service';
import { Employee } from '../models/employee.model';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
@Controller('tickets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TicketsController {
    constructor(
        private readonly ticketsService: TicketsService,
        @InjectModel(Employee)
        private readonly employeeModel: typeof Employee,
    ) { }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Post()
    create(@Body() createTicketDto: any, @Request() req) {
        return this.ticketsService.create(createTicketDto, req.user.userId);
    }

    @Get()
    findAll(@Query('departmentId') departmentId: string, @Request() req) {
        const deptId = req.user.role === 'HEAD_OF_DEPARTMENT' ? req.user.departmentId : departmentId;
        return deptId ? this.ticketsService.findByDepartment(deptId) : this.ticketsService.findAll();
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get('my-tickets')
    findMyTickets(@Request() req) {
        return this.ticketsService.findByCreator(req.user.userId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Get('department')
    async findDepartmentTickets(@Request() req) {
        const employee = await this.employeeModel.findOne({ where: { userId: req.user.userId } });
        const deptId = employee?.getDataValue('departmentId');
        if (!deptId) return [];
        return this.ticketsService.findByDepartmentAll(deptId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ticketsService.findOne(id);
    }

    @Patch(':id/take')
    takeTicket(@Param('id') id: string, @Request() req) {
        return this.ticketsService.assign(id, req.body.employeeId);
    }

    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
    @Patch(':id/accept')
    acceptTicket(@Param('id') id: string, @Request() req) {
        return this.ticketsService.acceptForUser(id, req.user.userId);
    }

    @Patch(':id/close')
    closeTicket(@Param('id') id: string) {
        return this.ticketsService.close(id);
    }
}

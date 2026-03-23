import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SalaryService } from './salary.service';

@Controller('salary')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class SalaryController {
    constructor(private readonly salaryService: SalaryService) {}

    @Get()
    findAll() {
        return this.salaryService.findAll();
    }

    @Patch(':id')
    updateSalary(@Param('id') id: string, @Body('salary') salary: number) {
        return this.salaryService.updateSalary(id, Number(salary));
    }

    @Post('pay')
    payBulk(@Body() body: { month: number; year: number }) {
        return this.salaryService.payBulk(Number(body.month), Number(body.year));
    }

    @Post('pay/:id')
    payOne(
        @Param('id') id: string,
        @Body() body: { month: number; year: number },
    ) {
        return this.salaryService.payOne(id, Number(body.month), Number(body.year));
    }

    @Post('advance/:id')
    payAdvance(
        @Param('id') id: string,
        @Body() body: { amount: number; note?: string },
    ) {
        return this.salaryService.payAdvance(id, Number(body.amount), body.note);
    }
}

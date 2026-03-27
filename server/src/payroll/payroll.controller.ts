import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PayrollService } from './payroll.service';

@Controller('payroll')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('MANAGER', 'ACCOUNTANT')
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) {}

    /* ── My payslips (all roles) ── */

    @Get('my-payslips')
    @Roles('MANAGER', 'ACCOUNTANT', 'EMPLOYEE', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL')
    findMyPayslips(@Request() req: any) {
        return this.payrollService.findMyPayslips(req.user.userId);
    }

    @Get('runs')
    findAll() {
        return this.payrollService.findAll();
    }

    @Get('runs/:id')
    findOne(@Param('id') id: string) {
        return this.payrollService.findOne(id);
    }

    @Get('payslips/:id')
    findPayslip(@Param('id') id: string) {
        return this.payrollService.findPayslip(id);
    }

    @Patch('payslips/:id')
    updatePayslipDeductions(
        @Param('id') id: string,
        @Body() body: { manualDeductions: number; manualDeductionNote?: string },
    ) {
        return this.payrollService.updatePayslipDeductions(id, Number(body.manualDeductions), body.manualDeductionNote);
    }

    @Post('runs')
    create(@Body() dto: any) {
        return this.payrollService.create(dto.month, dto.year);
    }

    @Post('runs/:id/calculate')
    calculate(@Param('id') id: string) {
        return this.payrollService.calculate(id);
    }

    @Post('runs/:id/validate')
    validate(@Param('id') id: string, @Request() req: any) {
        return this.payrollService.validate(id, req.user.userId);
    }

    @Post('runs/:id/pay')
    pay(@Param('id') id: string, @Request() req: any) {
        return this.payrollService.pay(id, req.user.userId);
    }

    @Post('preview')
    preview(@Body() dto: any) {
        return this.payrollService.preview(dto.grossSalary);
    }

    /* ── Employee salary management ── */

    @Get('employees')
    findAllEmployees() {
        return this.payrollService.findAllEmployees();
    }

    @Patch('employees/:id')
    updateSalary(@Param('id') id: string, @Body('salary') salary: number) {
        return this.payrollService.updateSalary(id, Number(salary));
    }

    @Post('advance/:id')
    payAdvance(
        @Param('id') id: string,
        @Body() body: { amount: number; note?: string },
        @Request() req: any,
    ) {
        return this.payrollService.payAdvance(id, Number(body.amount), req.user.userId, body.note);
    }

    /* ── Payslip toggles & custom deductions ── */

    @Patch('payslips/:id/toggles')
    updatePayslipToggles(
        @Param('id') id: string,
        @Body() body: any,
    ) {
        return this.payrollService.updatePayslipToggles(id, body);
    }

    @Patch('runs/:id/bulk-toggles')
    bulkUpdateToggles(
        @Param('id') id: string,
        @Body() body: { payslipIds: string[]; toggles?: any; customDeductionAction?: any },
    ) {
        return this.payrollService.bulkUpdateToggles(id, body.payslipIds, body.toggles, body.customDeductionAction);
    }

    /* ── Deduction Types CRUD ── */

    @Get('deduction-types')
    findAllDeductionTypes() {
        return this.payrollService.findAllDeductionTypes();
    }

    @Post('deduction-types')
    createDeductionType(@Body() dto: any) {
        return this.payrollService.createDeductionType(dto);
    }

    @Patch('deduction-types/:id')
    updateDeductionType(@Param('id') id: string, @Body() dto: any) {
        return this.payrollService.updateDeductionType(id, dto);
    }

    @Delete('deduction-types/:id')
    deleteDeductionType(@Param('id') id: string) {
        return this.payrollService.deleteDeductionType(id);
    }
}

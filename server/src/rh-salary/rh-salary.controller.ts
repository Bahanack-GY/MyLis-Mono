import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RhSalaryService, PointsBracket, ManualEmployeeAdjustment } from './rh-salary.service';

@Controller('rh-salary')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('RH', 'MANAGER')
export class RhSalaryController {
  constructor(private readonly service: RhSalaryService) {}

  @Get('preview')
  preview(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('workDays') workDays?: string,
    @Query('brackets') brackets?: string,
    @Query('employeeIds') employeeIds?: string,
  ) {
    return this.service.preview({
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      workDaysPerMonth: workDays ? parseInt(workDays, 10) : undefined,
      brackets: brackets ? (JSON.parse(brackets) as PointsBracket[]) : undefined,
      employeeIds: employeeIds ? employeeIds.split(',') : undefined,
    });
  }

  @Post('apply')
  apply(
    @Body()
    body: {
      month: number;
      year: number;
      workDaysPerMonth?: number;
      brackets?: PointsBracket[];
      employeeIds?: string[];
      manualAdjustments?: ManualEmployeeAdjustment[];
    },
  ) {
    return this.service.apply(body);
  }

  @Get('applied')
  getApplied(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.service.getApplied(parseInt(month, 10), parseInt(year, 10));
  }
}

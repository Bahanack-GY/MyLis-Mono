import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CommercialGoalsService } from './commercial-goals.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('commercial-goals')
export class CommercialGoalsController {
    constructor(private readonly service: CommercialGoalsService) { }

    /**
     * GET /commercial-goals?year=2026&month=3
     * Manager view: returns all commercials with their CA vs goal for the period.
     */
    @Get()
    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL')
    getTeamPerformance(@Query() query: { year?: string; month?: string }) {
        const now = new Date();
        const year = query.year ? parseInt(query.year, 10) : now.getFullYear();
        const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1;
        return this.service.getTeamPerformance(year, month);
    }

    /**
     * GET /commercial-goals/my?year=2026&month=3
     * Commercial view: returns own CA vs goal for the period.
     */
    @Get('my')
    @Roles('COMMERCIAL', 'MANAGER', 'HEAD_OF_DEPARTMENT')
    getMyGoal(@Request() req: any, @Query() query: { year?: string; month?: string }) {
        const now = new Date();
        const year = query.year ? parseInt(query.year, 10) : now.getFullYear();
        const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1;
        const employeeId = req.user?.employeeId;
        return this.service.getMyGoal(employeeId, year, month);
    }

    /**
     * GET /commercial-goals/employee-goal?employeeId=xxx&year=2026&month=3
     * Manager view: returns a specific commercial's CA vs goal for the period.
     */
    @Get('employee-goal')
    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL')
    getEmployeeGoal(@Query() query: { employeeId: string; year?: string; month?: string }) {
        const now = new Date();
        const year = query.year ? parseInt(query.year, 10) : now.getFullYear();
        const month = query.month ? parseInt(query.month, 10) : now.getMonth() + 1;
        return this.service.getMyGoal(query.employeeId, year, month);
    }

    /**
     * POST /commercial-goals
     * Manager: set or update a monthly CA goal for a commercial.
     * Body: { employeeId, year, month, targetAmount }
     */
    @Post()
    @Roles('MANAGER', 'HEAD_OF_DEPARTMENT')
    setGoal(@Body() body: { employeeId: string; year: number; month: number; targetAmount: number }) {
        return this.service.upsert(body);
    }
}

import { Controller, Get, Post, Query, Request, ForbiddenException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectModel } from '@nestjs/sequelize';
import { Op, fn, col, literal } from 'sequelize';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CarwashStation } from '../models/carwash-station.model';
import { CarwashEmployee } from '../models/carwash-employee.model';
import { CarwashDailyStat } from '../models/carwash-daily-stat.model';
import { Employee } from '../models/employee.model';
import { CarwashSyncService } from './carwash-sync.service';

const LIS_CARWASH_DEPT_ID = '7610e7a2-8ace-4d02-bd68-8394b71615e7';

@Controller('carwash')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('CEO', 'MANAGER', 'ACCOUNTANT', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE')
export class CarwashController {
    constructor(
        @InjectModel(CarwashStation) private stationModel: typeof CarwashStation,
        @InjectModel(CarwashEmployee) private employeeModel: typeof CarwashEmployee,
        @InjectModel(CarwashDailyStat) private statModel: typeof CarwashDailyStat,
        @InjectModel(Employee) private myLisEmployeeModel: typeof Employee,
        private readonly syncService: CarwashSyncService,
    ) {}

    private async checkAccess(req: any): Promise<void> {
        if (['CEO', 'MANAGER', 'ACCOUNTANT'].includes(req.user.role)) return;
        if (['HEAD_OF_DEPARTMENT', 'EMPLOYEE'].includes(req.user.role)) {
            const emp = await this.myLisEmployeeModel.findOne({
                where: { userId: req.user.userId },
                attributes: ['departmentId'],
            });
            if (emp?.departmentId === LIS_CARWASH_DEPT_ID) return;
        }
        throw new ForbiddenException('Access restricted to LIS CARWASH team');
    }

    @Get('stations')
    async getStations(@Request() req) {
        await this.checkAccess(req);
        return this.stationModel.findAll({ order: [['nom', 'ASC']] });
    }

    @Get('employees')
    async getEmployees(@Request() req, @Query('stationId') stationId?: string) {
        await this.checkAccess(req);
        const where: any = {};
        if (stationId) where.stationId = parseInt(stationId, 10);
        return this.employeeModel.findAll({ where, order: [['nom', 'ASC'], ['prenom', 'ASC']] });
    }

    @Get('daily-stats')
    async getDailyStats(
        @Request() req,
        @Query('stationId') stationId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        await this.checkAccess(req);
        const where: any = {};
        if (stationId) where.stationId = parseInt(stationId, 10);
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = startDate;
            if (endDate) where.date[Op.lte] = endDate;
        }
        return this.statModel.findAll({ where, order: [['date', 'ASC']] });
    }

    @Get('overview')
    async getOverview(
        @Request() req,
        @Query('stationId') stationId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        await this.checkAccess(req);
        const where: any = {};
        if (stationId) where.stationId = parseInt(stationId, 10);
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = startDate;
            if (endDate) where.date[Op.lte] = endDate;
        }

        const rows = await this.statModel.findAll({
            where,
            attributes: [
                [fn('SUM', col('revenue')), 'totalRevenue'],
                [fn('SUM', col('expenses')), 'totalExpenses'],
                [fn('SUM', col('vehicles')), 'totalVehicles'],
            ],
            raw: true,
        });
        const agg: any = rows[0] ?? {};
        return {
            totalRevenue: Number(agg.totalRevenue) || 0,
            totalExpenses: Number(agg.totalExpenses) || 0,
            totalVehicles: Number(agg.totalVehicles) || 0,
            stationsCount: await this.stationModel.count(),
            employeesCount: await this.employeeModel.count({ where: { actif: true } }),
        };
    }

    @Get('wash-types')
    async getWashTypes(@Request() req) {
        await this.checkAccess(req);
        return this.syncService.getWashTypes();
    }

    @Get('extras')
    async getExtras(@Request() req) {
        await this.checkAccess(req);
        return this.syncService.getExtras();
    }

    @Get('sync-status')
    async getSyncStatus(@Request() req) {
        await this.checkAccess(req);
        const last = await this.syncService.getLastSync();
        return { lastSync: last, syncing: this.syncService.isSyncing() };
    }

    @Post('sync')
    async triggerSync(@Request() req) {
        await this.checkAccess(req);
        if (this.syncService.isSyncing()) return { message: 'Sync already in progress' };
        this.syncService.runSync(90).catch(() => {});
        return { message: 'Sync started' };
    }
}

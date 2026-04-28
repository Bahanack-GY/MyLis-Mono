import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CarwashStation } from '../models/carwash-station.model';
import { CarwashEmployee } from '../models/carwash-employee.model';
import { CarwashDailyStat } from '../models/carwash-daily-stat.model';
import { CarwashSyncLog } from '../models/carwash-sync-log.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { DepartmentService as DeptServiceModel } from '../models/department-service.model';
import { JournalEngineService } from '../accounting/journal-engine.service';
import { CacheService } from '../cache/cache.service';
import { CACHE_PATTERNS } from '../cache/cache.keys';

const CARWASH_API = process.env.CARWASH_API_URL ?? 'http://localhost:3091/api';
const CARWASH_EMAIL = process.env.CARWASH_ADMIN_EMAIL ?? 'admin@carwash.mylisapp.online';
const CARWASH_PASSWORD = process.env.CARWASH_ADMIN_PASSWORD ?? 'Admin@2025!';
const LIS_CARWASH_DEPT_ID = '7610e7a2-8ace-4d02-bd68-8394b71615e7';

/** Carwash role → MyLIS role */
const ROLE_MAP: Record<string, string> = {
    manager: 'HEAD_OF_DEPARTMENT',
    super_admin: 'MANAGER',
};

@Injectable()
export class CarwashSyncService implements OnModuleInit {
    private readonly logger = new Logger(CarwashSyncService.name);
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;
    private syncing = false;
    private systemUserId: string | null = null;

    constructor(
        @InjectModel(CarwashStation) private stationModel: typeof CarwashStation,
        @InjectModel(CarwashEmployee) private employeeModel: typeof CarwashEmployee,
        @InjectModel(CarwashDailyStat) private statModel: typeof CarwashDailyStat,
        @InjectModel(CarwashSyncLog) private logModel: typeof CarwashSyncLog,
        @InjectModel(Employee) private myLisEmployeeModel: typeof Employee,
        @InjectModel(User) private userModel: typeof User,
        @InjectModel(Department) private departmentModel: typeof Department,
        @InjectModel(Position) private positionModel: typeof Position,
        @InjectModel(DeptServiceModel) private deptServiceModel: typeof DeptServiceModel,
        private readonly journalEngine: JournalEngineService,
        private readonly cache: CacheService,
    ) {}

    async onModuleInit() {
        this.runSync(90).catch(e => this.logger.error('Initial carwash sync failed', e));
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async scheduledSync() {
        await this.runSync(7);
    }

    async runSync(daysBack = 7): Promise<{ stationsCount: number; employeesCount: number; daysCount: number }> {
        if (this.syncing) {
            this.logger.log('Carwash sync already in progress, skipping');
            return { stationsCount: 0, employeesCount: 0, daysCount: 0 };
        }
        this.syncing = true;
        const start = Date.now();
        this.logger.log(`Starting carwash sync (daysBack=${daysBack})`);

        try {
            await this.ensureToken();
            await this.resolveSystemUserId();

            const stations = await this.syncStations();
            const employees = await this.syncEmployees();
            await this.syncWashTypesAsServices();
            const daysCount = await this.syncDailyStats(daysBack);

            // Bust departments cache so org chart + members list reflect newly synced employees
            await this.cache.invalidateByPattern(CACHE_PATTERNS.DEPARTMENTS);

            await this.logModel.create({ status: 'success', stationsCount: stations, employeesCount: employees, daysCount });
            this.logger.log(`Carwash sync done in ${Date.now() - start}ms — stations:${stations} employees:${employees} days:${daysCount}`);
            return { stationsCount: stations, employeesCount: employees, daysCount };
        } catch (err: any) {
            this.logger.error('Carwash sync error', err?.message);
            await this.logModel.create({ status: 'error', error: err?.message ?? String(err) });
            throw err;
        } finally {
            this.syncing = false;
        }
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    private async ensureToken(): Promise<void> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) return;
        const res = await this.carwashFetch('/auth/login', 'POST', { email: CARWASH_EMAIL, password: CARWASH_PASSWORD }, false);
        this.accessToken = res.access_token;
        this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
    }

    private async carwashFetch(path: string, method = 'GET', body?: any, auth = true): Promise<any> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (auth && this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
        const res = await fetch(`${CARWASH_API}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) throw new Error(`Carwash API ${method} ${path} → ${res.status}`);
        return res.json();
    }

    private async resolveSystemUserId(): Promise<void> {
        if (this.systemUserId) return;
        const manager = await this.userModel.findOne({
            where: { role: 'MANAGER' },
            order: [['createdAt', 'ASC']],
            attributes: ['id'],
        });
        this.systemUserId = manager?.id ?? null;
    }

    // ── Stations ──────────────────────────────────────────────────────────────

    private async syncStations(): Promise<number> {
        const stations: any[] = await this.carwashFetch('/stations');
        for (const s of stations) {
            await this.stationModel.upsert({
                id: s.id,
                nom: s.nom,
                adresse: s.adresse ?? null,
                town: s.town ?? null,
                contact: s.contact ?? null,
                status: s.status ?? 'active',
                employeeCount: parseInt(s.employeeCount ?? '0', 10) || 0,
                managerName: s.managerName ?? null,
                syncedAt: new Date(),
            });
        }
        return stations.length;
    }

    // ── Employees → sync as real MyLIS employees ──────────────────────────────

    private async syncEmployees(): Promise<number> {
        let page = 1;
        const allUsers: any[] = [];
        while (true) {
            const res: any = await this.carwashFetch(`/users?page=${page}&limit=100`);
            const rows: any[] = res.data ?? res;
            if (!rows.length) break;
            allUsers.push(...rows);
            if (rows.length < 100) break;
            page++;
        }

        // Sync raw carwash employee table
        for (const u of allUsers) {
            const activeAffectation = (u.affectations ?? []).find((a: any) => a.statut === 'active');
            await this.employeeModel.upsert({
                id: u.id,
                nom: u.nom,
                prenom: u.prenom,
                email: u.email ?? null,
                telephone: u.telephone ?? null,
                role: u.role,
                actif: u.actif ?? true,
                bonusParLavage: u.bonusParLavage ? Number(u.bonusParLavage) : null,
                globalAccess: u.globalAccess ?? false,
                stationId: activeAffectation?.stationId ?? null,
                stationName: activeAffectation?.station?.nom ?? null,
                profilePicture: u.profilePicture ?? null,
                syncedAt: new Date(),
            });
        }

        // Sync active employees (not the service account) as real MyLIS employees
        const activeCarwashUsers = allUsers.filter(
            u => u.actif && u.email && u.email !== CARWASH_EMAIL,
        );
        await this.syncToMyLisEmployees(activeCarwashUsers);

        return allUsers.length;
    }

    private async syncToMyLisEmployees(carwashUsers: any[]): Promise<void> {
        for (const u of carwashUsers) {
            try {
                const myLisRole = ROLE_MAP[u.role] ?? 'EMPLOYEE';
                let myLisUser = await this.userModel.findOne({ where: { email: u.email } });

                if (!myLisUser) {
                    const hash = await bcrypt.hash('ChangeMe123!', 10);
                    myLisUser = await this.userModel.create({
                        id: uuidv4(),
                        email: u.email,
                        passwordHash: hash,
                        role: myLisRole,
                    } as any);
                }

                // Check if employee record exists
                const existingEmp = await this.myLisEmployeeModel.findOne({
                    where: { userId: myLisUser.id },
                });

                if (!existingEmp) {
                    await this.myLisEmployeeModel.create({
                        id: uuidv4(),
                        userId: myLisUser.id,
                        firstName: u.prenom || u.nom,
                        lastName: u.nom,
                        departmentId: LIS_CARWASH_DEPT_ID,
                        phoneNumber: u.telephone ?? null,
                        hireDate: new Date().toISOString().split('T')[0],
                    } as any);
                    this.logger.log(`Created MyLIS employee: ${u.prenom} ${u.nom} (${u.email})`);
                } else if (existingEmp.getDataValue('departmentId') !== LIS_CARWASH_DEPT_ID) {
                    // Employee exists but in different dept — don't override their dept
                    this.logger.log(`Skipping dept reassignment for ${u.email} (already in another dept)`);
                }
            } catch (err: any) {
                this.logger.warn(`Could not sync employee ${u.email}: ${err.message}`);
            }
        }
    }

    // ── Wash types → DepartmentServices ──────────────────────────────────────

    private async syncWashTypesAsServices(): Promise<void> {
        try {
            const washTypes: any[] = await this.carwashFetch('/wash-types');
            const extras: any[] = await this.carwashFetch('/extras');

            const upsertService = async (name: string, description: string, price: number | null) => {
                const existing = await this.deptServiceModel.findOne({
                    where: { departmentId: LIS_CARWASH_DEPT_ID, name },
                });
                if (existing) {
                    await existing.update({ description, price, isActive: true });
                } else {
                    await (this.deptServiceModel as any).create({
                        departmentId: LIS_CARWASH_DEPT_ID,
                        name,
                        description,
                        price,
                        isActive: true,
                    });
                }
            };

            for (const wt of washTypes) {
                const nom = wt.nom ?? wt.name ?? 'Lavage';
                const prix = wt.prix ?? wt.price ?? null;
                await upsertService(nom, prix ? `${prix} FCFA` : 'Lavage standard', prix ? Number(prix) : null);
            }

            for (const ex of extras) {
                const nom = `Extra: ${ex.nom ?? ex.name ?? 'Service'}`;
                const prix = ex.prix ?? ex.price ?? null;
                await upsertService(nom, prix ? `+${prix} FCFA` : 'Service spécial', prix ? Number(prix) : null);
            }
        } catch (err: any) {
            this.logger.warn(`Wash type sync failed: ${err.message}`);
        }
    }

    // ── Daily stats + journal entries ─────────────────────────────────────────

    private async syncDailyStats(daysBack: number): Promise<number> {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - daysBack);

        const fmt = (d: Date) => d.toISOString().split('T')[0];

        const revenueData: any[] = await this.carwashFetch(
            `/dashboard/global/revenue-by-station?startDate=${fmt(startDate)}&endDate=${fmt(today)}`,
        );

        const revenueMap: Record<number, Record<string, number>> = {};
        for (const stationData of revenueData) {
            revenueMap[stationData.stationId] = {};
            for (const point of stationData.data ?? []) {
                const dateKey = point.date?.split('T')[0];
                if (dateKey) revenueMap[stationData.stationId][dateKey] = Number(point.amount) || 0;
            }
        }

        const stations: any[] = await this.stationModel.findAll({ attributes: ['id', 'nom'] });
        let daysCount = 0;
        const todayStr = fmt(today);

        for (const station of stations) {
            const statsData: any = await this.carwashFetch(
                `/dashboard/stats?stationId=${station.id}&startDate=${fmt(startDate)}&endDate=${todayStr}`,
            );
            const totalExpenses = Number(statsData.expenses ?? 0);
            const totalVehicles = Number(statsData.vehicules ?? 0);

            for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
                const dateStr = fmt(new Date(d));
                const isToday = dateStr === todayStr;
                const dayRevenue = revenueMap[station.id]?.[dateStr] ?? 0;

                await (this.statModel as any).upsert({
                    stationId: station.id,
                    stationName: station.nom,
                    date: dateStr,
                    revenue: dayRevenue,
                    expenses: isToday ? totalExpenses : 0,
                    vehicles: isToday ? totalVehicles : 0,
                    syncedAt: new Date(),
                }, { conflictFields: ['stationId', 'date'] });

                // Write journal entries for revenue/expenses
                if (this.systemUserId) {
                    if (dayRevenue > 0) {
                        await this.journalEngine.onCarwashRevenueSynced({
                            stationId: station.id,
                            stationName: station.nom,
                            date: dateStr,
                            amount: dayRevenue,
                            departmentId: LIS_CARWASH_DEPT_ID,
                            userId: this.systemUserId,
                        });
                    }
                    if (isToday && totalExpenses > 0) {
                        await this.journalEngine.onCarwashExpenseSynced({
                            stationId: station.id,
                            stationName: station.nom,
                            date: dateStr,
                            amount: totalExpenses,
                            departmentId: LIS_CARWASH_DEPT_ID,
                            userId: this.systemUserId,
                        });
                    }
                }

                daysCount++;
            }
        }

        return daysCount;
    }

    // ── Public getters ─────────────────────────────────────────────────────────

    async getLastSync() {
        return this.logModel.findOne({ order: [['syncedAt', 'DESC']] });
    }

    isSyncing() {
        return this.syncing;
    }

    /** Proxy: fetch wash types from carwash API (for frontend display) */
    async getWashTypes(): Promise<any[]> {
        await this.ensureToken();
        return this.carwashFetch('/wash-types');
    }

    /** Proxy: fetch extras from carwash API */
    async getExtras(): Promise<any[]> {
        await this.ensureToken();
        return this.carwashFetch('/extras');
    }
}

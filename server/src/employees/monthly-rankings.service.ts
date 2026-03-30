import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron } from '@nestjs/schedule';
import { Op } from 'sequelize';
import { Employee } from '../models/employee.model';
import { EmployeeMonthlyRanking } from '../models/employee-monthly-ranking.model';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';

@Injectable()
export class MonthlyRankingsService {
    private readonly logger = new Logger(MonthlyRankingsService.name);

    constructor(
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(EmployeeMonthlyRanking)
        private rankingModel: typeof EmployeeMonthlyRanking,
        @InjectModel(Task)
        private taskModel: typeof Task,
    ) {}

    /**
     * Runs every day at 8:00 PM.
     * If today is the last day of the month, snapshot the top-3.
     */
    @Cron('0 20 * * *')
    async checkAndSnapshotMonthlyRankings() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Only proceed on the last day of the month
        if (tomorrow.getDate() !== 1) return;

        this.logger.log(`Last day of month — snapshotting top-3 employee rankings`);
        await this.snapshotMonthlyRankings(now.getFullYear(), now.getMonth() + 1);
    }

    /**
     * Core logic: find top-3 active employees by points + task stats and save.
     */
    async snapshotMonthlyRankings(year: number, month: number): Promise<EmployeeMonthlyRanking[]> {
        // Start/end of target month for task queries
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd   = new Date(year, month, 1);

        // Get top 3 active employees ordered by points
        const top3 = await this.employeeModel.findAll({
            where: { dismissed: false },
            order: [['points', 'DESC']],
            limit: 3,
        });

        if (top3.length === 0) {
            this.logger.warn('No active employees found — skipping monthly snapshot');
            return [];
        }

        // Delete any existing snapshot for this year/month (idempotent)
        await this.rankingModel.destroy({ where: { year, month } });

        const results: EmployeeMonthlyRanking[] = [];

        for (let i = 0; i < top3.length; i++) {
            const emp = top3[i];

            // Count tasks completed this month
            const tasksCompleted = await this.taskModel.count({
                where: {
                    assigneeId: emp.id,
                    state: { [Op.in]: ['COMPLETED', 'REVIEWED'] },
                    completedAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
                },
            });

            // Count tasks reviewed this month
            const tasksReviewed = await this.taskModel.count({
                where: {
                    assigneeId: emp.id,
                    state: 'REVIEWED',
                    completedAt: { [Op.gte]: monthStart, [Op.lt]: monthEnd },
                },
            });

            const ranking = await this.rankingModel.create({
                year,
                month,
                rank: i + 1,
                employeeId: emp.id,
                points: emp.get('points') as number || 0,
                tasksCompleted,
                tasksReviewed,
            });

            results.push(ranking);
        }

        this.logger.log(`Monthly rankings saved: ${results.length} entries for ${year}/${month}`);
        return results;
    }

    /**
     * Get full ranking history for a given year (all months, all 3 ranks).
     */
    async getMonthlyRankings(year: number) {
        const rankings = await this.rankingModel.findAll({
            where: { year },
            order: [['month', 'ASC'], ['rank', 'ASC']],
            include: [
                {
                    model: Employee,
                    include: [
                        { model: User, attributes: ['firstName', 'lastName', 'avatarUrl'] },
                        { model: Department, attributes: ['id', 'name'] },
                        { model: Position, attributes: ['title'] },
                    ],
                },
            ],
        });

        // Reshape into { month -> [rank1, rank2, rank3] }
        const byMonth: Record<number, any[]> = {};
        for (let m = 1; m <= 12; m++) byMonth[m] = [];

        for (const r of rankings) {
            const plain = r.get({ plain: true }) as any;
            byMonth[plain.month].push({
                rank: plain.rank,
                points: plain.points,
                tasksCompleted: plain.tasksCompleted,
                tasksReviewed: plain.tasksReviewed,
                employee: {
                    id: plain.employee?.id,
                    firstName: plain.employee?.user?.firstName || plain.employee?.firstName || '',
                    lastName: plain.employee?.user?.lastName || plain.employee?.lastName || '',
                    avatarUrl: plain.employee?.user?.avatarUrl || plain.employee?.avatarUrl || null,
                    department: plain.employee?.department?.name || '',
                    position: plain.employee?.position?.title || '',
                },
            });
        }

        return {
            year,
            months: byMonth,
            hasData: rankings.length > 0,
        };
    }

    /**
     * Employee of the year: most #1 finishes. Tie-break: most #2, then #3, then total points.
     */
    async getYearlyRanking(year: number) {
        const rankings = await this.rankingModel.findAll({
            where: { year },
            include: [
                {
                    model: Employee,
                    include: [
                        { model: User, attributes: ['firstName', 'lastName', 'avatarUrl'] },
                        { model: Department, attributes: ['id', 'name'] },
                        { model: Position, attributes: ['title'] },
                    ],
                },
            ],
        });

        if (rankings.length === 0) return null;

        // Aggregate per employee
        const empStats: Record<string, {
            employeeId: string; firstName: string; lastName: string;
            avatarUrl: string | null; department: string; position: string;
            rank1: number; rank2: number; rank3: number; totalPoints: number;
        }> = {};

        for (const r of rankings) {
            const plain = r.get({ plain: true }) as any;
            const empId = plain.employeeId;

            if (!empStats[empId]) {
                empStats[empId] = {
                    employeeId: empId,
                    firstName: plain.employee?.user?.firstName || plain.employee?.firstName || '',
                    lastName: plain.employee?.user?.lastName || plain.employee?.lastName || '',
                    avatarUrl: plain.employee?.user?.avatarUrl || plain.employee?.avatarUrl || null,
                    department: plain.employee?.department?.name || '',
                    position: plain.employee?.position?.title || '',
                    rank1: 0, rank2: 0, rank3: 0, totalPoints: 0,
                };
            }

            if (plain.rank === 1) empStats[empId].rank1++;
            if (plain.rank === 2) empStats[empId].rank2++;
            if (plain.rank === 3) empStats[empId].rank3++;
            empStats[empId].totalPoints += plain.points;
        }

        const sorted = Object.values(empStats).sort((a, b) =>
            b.rank1 - a.rank1 ||
            b.rank2 - a.rank2 ||
            b.rank3 - a.rank3 ||
            b.totalPoints - a.totalPoints
        );

        return {
            year,
            winner: sorted[0] || null,
            podium: sorted.slice(0, 3),
        };
    }

    /**
     * Available years that have data.
     */
    async getAvailableYears(): Promise<number[]> {
        const rows = await this.rankingModel.findAll({
            attributes: ['year'],
            group: ['year'],
            order: [['year', 'DESC']],
        });
        return rows.map(r => (r.get('year') as number));
    }
}

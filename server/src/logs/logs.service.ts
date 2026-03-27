
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Log } from '../models/log.model';
import { Op } from 'sequelize';

@Injectable()
export class LogsService {
    constructor(
        @InjectModel(Log)
        private logModel: typeof Log,
    ) { }

    create(action: string, userId: string, details: any = {}) {
        return this.logModel.create({
            action,
            userId,
            details,
            timestamp: new Date(),
        });
    }

    async findAll(action?: string, from?: string, to?: string, page = 1, limit = 10) {
        const where: any = {};
        if (action) where.action = action;
        if (from || to) {
            where.timestamp = {};
            if (from) where.timestamp[Op.gte] = new Date(from);
            if (to) where.timestamp[Op.lte] = new Date(to);
        }

        const offset = (page - 1) * limit;

        const { count: total, rows: logs } = await this.logModel.findAndCountAll({
            where,
            order: [['timestamp', 'DESC']],
            limit,
            offset,
        });

        if (logs.length === 0) return { data: [], total, page, totalPages: Math.ceil(total / limit) };

        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
        let userMap = new Map<string, any>();

        if (userIds.length > 0) {
            try {
                const [users] = await this.logModel.sequelize!.query(`
                    SELECT u.id::text AS id, u.email, u.role,
                           e."firstName", e."lastName", e."avatarUrl"
                    FROM "Users" u
                    LEFT JOIN "Employees" e ON u.id = e."userId"
                    WHERE u.id::text IN (:userIds)
                `, { replacements: { userIds } });

                userMap = new Map((users as any[]).map(u => [u.id, {
                    id: u.id,
                    email: u.email,
                    role: u.role,
                    employee: u.firstName
                        ? { firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl }
                        : null,
                }]));
            } catch { /* fallback to details fields */ }
        }

        const data = logs.map(log => {
            const json = log.toJSON() as any;
            const details = json.details || {};
            json.user = userMap.get(log.userId) || {
                id: log.userId,
                email: details.userEmail || null,
                role: details.userRole || null,
                employee: null,
            };
            json.details = {
                ...(details.entity !== undefined && { entity: details.entity }),
                ...(details.target !== undefined && { target: details.target }),
                ...(details.userEmail !== undefined && { userEmail: details.userEmail }),
                ...(details.userRole !== undefined && { userRole: details.userRole }),
            };
            return json;
        });

        return { data, total, page, totalPages: Math.ceil(total / limit) };
    }

    async getStats(from?: string, to?: string) {
        const where: any = {};
        if (from || to) {
            where.timestamp = {};
            if (from) where.timestamp[Op.gte] = new Date(from);
            if (to) where.timestamp[Op.lte] = new Date(to);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const [total, todayCount] = await Promise.all([
            this.logModel.count({ where }),
            this.logModel.count({ where: { ...where, timestamp: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
        ]);

        // Active users (distinct userIds in range)
        const [activeUsersRows] = await this.logModel.sequelize!.query(
            `SELECT COUNT(DISTINCT "userId") AS count FROM "Logs"${
                Object.keys(where).length
                    ? ` WHERE "timestamp" >= :from AND "timestamp" <= :to`
                    : ''
            }`,
            { replacements: { from: from ? new Date(from) : new Date(0), to: to ? new Date(to) : new Date() } },
        );
        const activeUsers = Number((activeUsersRows as any[])[0]?.count || 0);

        // Top action
        const [actionRows] = await this.logModel.sequelize!.query(
            `SELECT action, COUNT(*) AS count FROM "Logs"${
                Object.keys(where).length
                    ? ` WHERE "timestamp" >= :from AND "timestamp" <= :to`
                    : ''
            } GROUP BY action ORDER BY count DESC LIMIT 1`,
            { replacements: { from: from ? new Date(from) : new Date(0), to: to ? new Date(to) : new Date() } },
        );
        const topAction = (actionRows as any[])[0]?.action || null;

        // Last 7 days chart
        const chartData: { day: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(d.getDate() + 1);
            const count = await this.logModel.count({
                where: { timestamp: { [Op.gte]: d, [Op.lt]: next } },
            });
            chartData.push({ day: d.toISOString().split('T')[0], count });
        }

        return { total, todayCount, activeUsers, topAction, chartData };
    }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LeadActivity } from '../models/lead-activity.model';
import { Lead } from '../models/lead.model';
import { Employee } from '../models/employee.model';
import { Invoice } from '../models/invoice.model';
import { Client } from '../models/client.model';

@Injectable()
export class LeadActivitiesService {
    constructor(
        @InjectModel(LeadActivity)
        private activityModel: typeof LeadActivity,
        @InjectModel(Lead)
        private leadModel: typeof Lead,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectModel(Client)
        private clientModel: typeof Client,
    ) { }

    private async getEmployeeIdByUserId(userId: string): Promise<string | null> {
        const employee = await this.employeeModel.findOne({ where: { userId }, attributes: ['id'] });
        return employee?.id || null;
    }

    async create(dto: any, currentUser?: { userId: string; role: string }): Promise<LeadActivity> {
        // Validation: Either leadId OR clientId must be provided (not both, not neither)
        const hasLeadId = !!dto.leadId;
        const hasClientId = !!dto.clientId;
        if ((!hasLeadId && !hasClientId) || (hasLeadId && hasClientId)) {
            throw new BadRequestException('Either leadId or clientId must be provided (not both)');
        }

        // COMMERCIAL users auto-set employeeId to self
        if (currentUser?.role === 'COMMERCIAL' && !dto.employeeId) {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) dto.employeeId = employeeId;
        }

        const activity = await this.activityModel.create(dto);

        // Auto-update lead's lastAction fields (only for lead activities, not client activities)
        if (dto.leadId) {
            await this.leadModel.update({
                lastAction: dto.description || dto.type,
                lastActionDate: dto.date,
                lastActionResult: dto.result || null,
            }, { where: { id: dto.leadId } });
        }

        return this.findOne(activity.id);
    }

    async findAll(filters: {
        page?: number;
        limit?: number;
        leadId?: string;
        clientId?: string;
        employeeId?: string;
        type?: string;
        activityStatus?: string;
        dateFrom?: string;
        dateTo?: string;
    }, currentUser?: { userId: string; role: string }) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = {};

        if (filters.leadId) where.leadId = filters.leadId;
        if (filters.clientId) where.clientId = filters.clientId;
        if (filters.employeeId) where.employeeId = filters.employeeId;
        if (filters.type) where.type = filters.type;
        if (filters.activityStatus) where.activityStatus = filters.activityStatus;
        if (filters.dateFrom || filters.dateTo) {
            where.date = {};
            if (filters.dateFrom) where.date[Op.gte] = filters.dateFrom;
            if (filters.dateTo) where.date[Op.lte] = filters.dateTo;
        }

        // COMMERCIAL users can only see their own activities
        if (currentUser?.role === 'COMMERCIAL') {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) where.employeeId = employeeId;
        }

        const { count, rows } = await this.activityModel.findAndCountAll({
            where,
            include: [
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Client, attributes: ['id', 'name'] },
                { model: Employee, attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
            limit,
            offset,
        });

        return {
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
    }

    async findOne(id: string): Promise<LeadActivity> {
        const activity = await this.activityModel.findByPk(id, {
            include: [
                { model: Lead, attributes: ['id', 'code', 'company'] },
                { model: Client, attributes: ['id', 'name'] },
                { model: Employee, attributes: ['id', 'firstName', 'lastName'] },
            ],
        });
        if (!activity) throw new NotFoundException('Activity not found');
        return activity;
    }

    async update(id: string, dto: any): Promise<LeadActivity> {
        const activity = await this.findOne(id);
        await activity.update(dto);
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ success: boolean }> {
        const activity = await this.findOne(id);
        await activity.destroy();
        return { success: true };
    }

    async getKpis(filters: { employeeId?: string; dateFrom?: string; dateTo?: string }, currentUser?: { userId: string; role: string }) {
        // COMMERCIAL users see only their own KPIs
        if (currentUser?.role === 'COMMERCIAL' && !filters.employeeId) {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) filters.employeeId = employeeId;
        }

        // Activity filters
        const actWhere: any = { activityStatus: 'COMPLETED' };
        if (filters.employeeId) actWhere.employeeId = filters.employeeId;
        if (filters.dateFrom || filters.dateTo) {
            actWhere.date = {};
            if (filters.dateFrom) actWhere.date[Op.gte] = filters.dateFrom;
            if (filters.dateTo) actWhere.date[Op.lte] = filters.dateTo;
        }

        const activities = await this.activityModel.findAll({ where: actWhere });

        const visitesClients = activities.filter(a => a.type === 'VISITE_CLIENT').length;
        const visitesProspects = activities.filter(a => a.type === 'VISITE_PROSPECT').length;
        const totalVisites = visitesClients + visitesProspects;
        const coutVisites = activities
            .filter(a => ['VISITE_CLIENT', 'VISITE_PROSPECT'].includes(a.type))
            .reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

        // Invoice data for revenue KPIs — scoped to commercial's converted clients
        const invWhere: any = { status: 'PAID' };
        if (filters.dateFrom || filters.dateTo) {
            invWhere.paidAt = {};
            if (filters.dateFrom) invWhere.paidAt[Op.gte] = filters.dateFrom;
            if (filters.dateTo) invWhere.paidAt[Op.lte] = filters.dateTo;
        }
        if (filters.employeeId) {
            const convertedLeads = await this.leadModel.findAll({
                where: { assignedToId: filters.employeeId, clientId: { [Op.ne]: null } },
                attributes: ['clientId'],
            });
            const clientIds = convertedLeads.map(l => l.clientId).filter(Boolean);
            invWhere.clientId = clientIds.length > 0 ? { [Op.in]: clientIds } : null;
        }
        const invoices = await this.invoiceModel.findAll({ where: invWhere });
        const chiffreAffaire = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        const panierMoyen = invoices.length > 0 ? Math.round(chiffreAffaire / invoices.length) : 0;
        const margeParVisite = totalVisites > 0 ? Math.round((chiffreAffaire - coutVisites) / totalVisites) : 0;

        // Lead conversion data — scoped to employee if COMMERCIAL
        const leadWhere: any = {};
        if (filters.employeeId) leadWhere.assignedToId = filters.employeeId;
        if (filters.dateFrom || filters.dateTo) {
            leadWhere.convertedAt = {};
            if (filters.dateFrom) leadWhere.convertedAt[Op.gte] = filters.dateFrom;
            if (filters.dateTo) leadWhere.convertedAt[Op.lte] = filters.dateTo;
        }
        const conversions = await this.leadModel.count({
            where: { ...leadWhere, leadStatus: 'GAGNE', convertedAt: { [Op.ne]: null } },
        });

        const totalLeadsWhere: any = {};
        if (filters.employeeId) totalLeadsWhere.assignedToId = filters.employeeId;
        const totalLeads = await this.leadModel.count({ where: totalLeadsWhere });
        const tauxAcquisition = totalLeads > 0 ? Math.round(conversions / totalLeads * 100) : 0;

        // Pipeline — scoped to employee if COMMERCIAL
        const pipelineWhere: any = { saleStage: { [Op.notIn]: ['GAGNE', 'PERDU'] } };
        if (filters.employeeId) pipelineWhere.assignedToId = filters.employeeId;
        const pipelineLeads = await this.leadModel.findAll({ where: pipelineWhere });
        const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (Number(l.potentialRevenue) || 0), 0);
        const weightedPipeline = pipelineLeads.reduce((sum, l) =>
            sum + ((Number(l.potentialRevenue) || 0) * (l.successRate || 0) / 100), 0);

        // Win rate — scoped to employee if COMMERCIAL
        const wonWhere: any = { leadStatus: 'GAGNE' };
        const lostWhere: any = { leadStatus: 'PERDU' };
        if (filters.employeeId) {
            wonWhere.assignedToId = filters.employeeId;
            lostWhere.assignedToId = filters.employeeId;
        }
        const wonLeads = await this.leadModel.count({ where: wonWhere });
        const lostLeads = await this.leadModel.count({ where: lostWhere });
        const winRate = (wonLeads + lostLeads) > 0 ? Math.round(wonLeads / (wonLeads + lostLeads) * 100) : 0;
        const conversionRate = totalLeads > 0 ? Math.round(wonLeads / totalLeads * 100) : 0;

        return {
            totalVisites,
            visitesClients,
            visitesProspects,
            coutVisites: Math.round(coutVisites),
            chiffreAffaire: Math.round(chiffreAffaire),
            panierMoyen,
            margeParVisite,
            nouveauxClients: conversions,
            tauxAcquisition,
            pipelineValue: Math.round(pipelineValue),
            weightedPipeline: Math.round(weightedPipeline),
            winRate,
            conversionRate,
            totalActivities: activities.length,
        };
    }

    async getClientActivitiesReport(clientId: string, filters?: { dateFrom?: string; dateTo?: string }) {
        const where: any = { clientId, activityStatus: 'COMPLETED' };
        if (filters?.dateFrom || filters?.dateTo) {
            where.date = {};
            if (filters.dateFrom) where.date[Op.gte] = filters.dateFrom;
            if (filters.dateTo) where.date[Op.lte] = filters.dateTo;
        }

        const activities = await this.activityModel.findAll({
            where,
            include: [
                { model: Client, attributes: ['id', 'name'] },
                { model: Employee, attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['date', 'DESC']],
        });

        return {
            clientId,
            activities,
            summary: {
                totalActivities: activities.length,
                lastActivityDate: activities.length > 0 ? activities[0].date : null,
                activityBreakdown: this.groupActivitiesByType(activities),
            },
        };
    }

    async getClientHealthMetrics(clientId: string) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const lastActivity = await this.activityModel.findOne({
            where: { clientId, activityStatus: 'COMPLETED' },
            order: [['date', 'DESC']],
        });

        const recentActivities = await this.activityModel.count({
            where: {
                clientId,
                activityStatus: 'COMPLETED',
                date: { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] },
            },
        });

        const totalActivities = await this.activityModel.count({
            where: { clientId, activityStatus: 'COMPLETED' },
        });

        const daysSinceLastContact = lastActivity
            ? Math.floor((now.getTime() - new Date(lastActivity.date).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        return {
            clientId,
            lastContactDate: lastActivity?.date || null,
            daysSinceLastContact,
            activitiesLast30Days: recentActivities,
            totalActivities,
            healthStatus: this.calculateHealthStatus(daysSinceLastContact, recentActivities),
        };
    }

    private calculateHealthStatus(daysSinceLastContact: number | null, recentActivities: number): string {
        if (!daysSinceLastContact) return 'NEW';
        if (daysSinceLastContact > 90) return 'AT_RISK';
        if (daysSinceLastContact > 60) return 'ATTENTION_NEEDED';
        if (recentActivities >= 3) return 'HEALTHY';
        if (recentActivities >= 1) return 'GOOD';
        return 'NEEDS_FOLLOWUP';
    }

    private groupActivitiesByType(activities: LeadActivity[]): Record<string, number> {
        const breakdown: Record<string, number> = {};
        activities.forEach(a => {
            breakdown[a.type] = (breakdown[a.type] || 0) + 1;
        });
        return breakdown;
    }
}

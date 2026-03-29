import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { LeadActivity } from '../models/lead-activity.model';
import { Lead } from '../models/lead.model';
import { LeadNeed } from '../models/lead-need.model';
import { DepartmentService } from '../models/department-service.model';
import { Employee } from '../models/employee.model';
import { Invoice } from '../models/invoice.model';
import { Client } from '../models/client.model';

type CurrentUser = { userId: string; role: string; departmentId?: string };

@Injectable()
export class LeadActivitiesService {
    constructor(
        @InjectModel(LeadActivity)
        private activityModel: typeof LeadActivity,
        @InjectModel(Lead)
        private leadModel: typeof Lead,
        @InjectModel(LeadNeed)
        private needModel: typeof LeadNeed,
        @InjectModel(DepartmentService)
        private deptServiceModel: typeof DepartmentService,
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

    /** Returns lead IDs and converted client IDs scoped to a department's services. */
    private async getDeptLeadAndClientIds(departmentId: string): Promise<{ leadIds: string[]; clientIds: string[] }> {
        const services = await this.deptServiceModel.findAll({
            where: { departmentId },
            attributes: ['id'],
            raw: true,
        });
        if (!services.length) return { leadIds: [], clientIds: [] };
        const serviceIds = services.map((s: any) => s.id);
        const needs = await this.needModel.findAll({
            where: { serviceId: { [Op.in]: serviceIds } },
            attributes: ['leadId'],
            raw: true,
        });
        const leadIds = [...new Set(needs.map((n: any) => n.leadId))];
        if (!leadIds.length) return { leadIds: [], clientIds: [] };
        const leads = await this.leadModel.findAll({
            where: { id: { [Op.in]: leadIds }, clientId: { [Op.ne]: null } },
            attributes: ['clientId'],
            raw: true,
        });
        const clientIds = leads.map((l: any) => l.clientId).filter(Boolean);
        return { leadIds, clientIds };
    }

    async create(dto: any, currentUser?: CurrentUser): Promise<LeadActivity> {
        // Validation: leadId and clientId cannot both be provided
        const hasLeadId = !!dto.leadId;
        const hasClientId = !!dto.clientId;
        if (hasLeadId && hasClientId) {
            throw new BadRequestException('Only one of leadId or clientId may be provided');
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
    }, currentUser?: CurrentUser) {
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

        // HOD sees only activities linked to leads/clients from their department's services
        if (currentUser?.role === 'HEAD_OF_DEPARTMENT' && currentUser.departmentId && !filters.leadId && !filters.clientId) {
            const { leadIds, clientIds } = await this.getDeptLeadAndClientIds(currentUser.departmentId);
            const empty = '00000000-0000-0000-0000-000000000000';
            where[Op.and] = [
                ...(where[Op.and] || []),
                {
                    [Op.or]: [
                        { leadId: { [Op.in]: leadIds.length ? leadIds : [empty] } },
                        { clientId: { [Op.in]: clientIds.length ? clientIds : [empty] } },
                    ],
                },
            ];
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

    async getKpis(filters: { employeeId?: string; dateFrom?: string; dateTo?: string }, currentUser?: CurrentUser) {
        // COMMERCIAL users see only their own KPIs
        if (currentUser?.role === 'COMMERCIAL' && !filters.employeeId) {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) filters.employeeId = employeeId;
        }

        // HOD: pre-compute lead/client IDs scoped to their department
        let deptLeadIds: string[] | null = null;
        let deptClientIds: string[] | null = null;
        if (currentUser?.role === 'HEAD_OF_DEPARTMENT' && currentUser.departmentId) {
            const scope = await this.getDeptLeadAndClientIds(currentUser.departmentId);
            deptLeadIds = scope.leadIds;
            deptClientIds = scope.clientIds;
        }

        const empty = '00000000-0000-0000-0000-000000000000';

        // ── Activity stats ──────────────────────────────────────
        const actWhere: any = { activityStatus: 'COMPLETED' };
        if (filters.employeeId) actWhere.employeeId = filters.employeeId;
        if (filters.dateFrom || filters.dateTo) {
            actWhere.date = {};
            if (filters.dateFrom) actWhere.date[Op.gte] = filters.dateFrom;
            if (filters.dateTo) actWhere.date[Op.lte] = filters.dateTo;
        }
        if (deptLeadIds !== null) {
            actWhere[Op.and] = [{
                [Op.or]: [
                    { leadId: { [Op.in]: deptLeadIds.length ? deptLeadIds : [empty] } },
                    { clientId: { [Op.in]: deptClientIds!.length ? deptClientIds! : [empty] } },
                ],
            }];
        }

        const activities = await this.activityModel.findAll({ where: actWhere });
        const visitesClients = activities.filter(a => a.type === 'VISITE_CLIENT').length;
        const visitesProspects = activities.filter(a => a.type === 'VISITE_PROSPECT').length;
        const totalVisites = visitesClients + visitesProspects;
        const coutVisites = activities
            .filter(a => ['VISITE_CLIENT', 'VISITE_PROSPECT'].includes(a.type))
            .reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

        // ── Invoice / CA stats ───────────────────────────────────
        const invWhere: any = { status: 'PAID' };
        if (filters.dateFrom || filters.dateTo) {
            invWhere.paidAt = {};
            if (filters.dateFrom) invWhere.paidAt[Op.gte] = filters.dateFrom;
            if (filters.dateTo) invWhere.paidAt[Op.lte] = filters.dateTo;
        }
        if (filters.employeeId) {
            // scope invoices to clients converted by this commercial
            const convertedLeads = await this.leadModel.findAll({
                where: { assignedToId: filters.employeeId, clientId: { [Op.ne]: null } },
                attributes: ['clientId'],
            });
            const empClientIds = convertedLeads.map(l => l.clientId).filter(Boolean);
            invWhere.clientId = empClientIds.length > 0 ? { [Op.in]: empClientIds } : null;
        } else if (deptClientIds !== null) {
            // HOD: scope invoices to clients from their department
            invWhere.clientId = deptClientIds.length > 0 ? { [Op.in]: deptClientIds } : null;
        }
        const invoices = await this.invoiceModel.findAll({ where: invWhere });
        const chiffreAffaire = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        const panierMoyen = invoices.length > 0 ? Math.round(chiffreAffaire / invoices.length) : 0;
        const margeParVisite = totalVisites > 0 ? Math.round((chiffreAffaire - coutVisites) / totalVisites) : 0;

        // ── Lead stats ────────────────────────────────────────────
        // Base lead scope: employee filter OR HOD dept filter
        const baseLead: any = {};
        if (filters.employeeId) baseLead.assignedToId = filters.employeeId;
        if (deptLeadIds !== null) baseLead.id = { [Op.in]: deptLeadIds.length ? deptLeadIds : [empty] };

        const conversionWhere: any = { ...baseLead, leadStatus: 'GAGNE', clientId: { [Op.ne]: null } };
        if (filters.dateFrom || filters.dateTo) {
            conversionWhere.convertedAt = {};
            if (filters.dateFrom) conversionWhere.convertedAt[Op.gte] = filters.dateFrom;
            if (filters.dateTo) conversionWhere.convertedAt[Op.lte] = filters.dateTo;
        }
        const conversions = await this.leadModel.count({ where: conversionWhere });
        const totalLeads = await this.leadModel.count({ where: baseLead });
        const tauxAcquisition = totalLeads > 0 ? Math.round(conversions / totalLeads * 100) : 0;

        const pipelineLeads = await this.leadModel.findAll({
            where: { ...baseLead, saleStage: { [Op.notIn]: ['GAGNE', 'PERDU'] } },
        });
        const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (Number(l.potentialRevenue) || 0), 0);
        const weightedPipeline = pipelineLeads.reduce((sum, l) =>
            sum + ((Number(l.potentialRevenue) || 0) * (l.successRate || 0) / 100), 0);

        const wonLeads = await this.leadModel.count({ where: { ...baseLead, leadStatus: 'GAGNE' } });
        const lostLeads = await this.leadModel.count({ where: { ...baseLead, leadStatus: 'PERDU' } });
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

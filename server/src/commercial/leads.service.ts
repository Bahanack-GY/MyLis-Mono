import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Lead, SaleStage, LeadStatus, LeadPriority } from '../models/lead.model';
import { LeadActivity } from '../models/lead-activity.model';
import { LeadContact } from '../models/lead-contact.model';
import { LeadNeed } from '../models/lead-need.model';
import { DepartmentService } from '../models/department-service.model';
import { Client } from '../models/client.model';
import { Employee } from '../models/employee.model';

type CurrentUser = { userId: string; role: string; departmentId?: string };

@Injectable()
export class LeadsService {
    constructor(
        @InjectModel(Lead)
        private leadModel: typeof Lead,
        @InjectModel(LeadContact)
        private contactModel: typeof LeadContact,
        @InjectModel(LeadNeed)
        private needModel: typeof LeadNeed,
        @InjectModel(DepartmentService)
        private deptServiceModel: typeof DepartmentService,
        @InjectModel(Client)
        private clientModel: typeof Client,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectConnection()
        private sequelize: Sequelize,
    ) { }

    /** Returns the set of lead IDs that have at least one need for a service in the given department. */
    private async getLeadIdsByDepartment(departmentId: string): Promise<string[]> {
        const services = await this.deptServiceModel.findAll({
            where: { departmentId },
            attributes: ['id'],
            raw: true,
        });
        if (!services.length) return [];
        const serviceIds = services.map((s: any) => s.id);
        const needs = await this.needModel.findAll({
            where: { serviceId: { [Op.in]: serviceIds } },
            attributes: ['leadId'],
            raw: true,
        });
        return [...new Set(needs.map((n: any) => n.leadId))];
    }

    private async getEmployeeIdByUserId(userId: string): Promise<string | null> {
        const employee = await this.employeeModel.findOne({ where: { userId }, attributes: ['id'] });
        return employee?.id || null;
    }

    private mapStageToPriority(stage: SaleStage): LeadPriority {
        switch (stage) {
            case SaleStage.NEGOCIATION:
            case SaleStage.CLOSING:
            case SaleStage.GAGNE:
                return LeadPriority.HOT;
            case SaleStage.QUALIFICATION:
            case SaleStage.PROPOSITION:
                return LeadPriority.WARM;
            default: // PROSPECTION, PERDU
                return LeadPriority.COLD;
        }
    }

    private mapStageToStatus(stage: SaleStage): LeadStatus {
        switch (stage) {
            case SaleStage.PROSPECTION: return LeadStatus.NOUVEAU;
            case SaleStage.QUALIFICATION: return LeadStatus.QUALIFIE;
            case SaleStage.PROPOSITION: return LeadStatus.PROPOSITION_ENVOYEE;
            case SaleStage.NEGOCIATION: return LeadStatus.NEGOCIATION;
            case SaleStage.CLOSING: return LeadStatus.NEGOCIATION; /* map closing to negociation since no closer equivalent */
            case SaleStage.GAGNE: return LeadStatus.GAGNE;
            case SaleStage.PERDU: return LeadStatus.PERDU;
            default: return LeadStatus.CONTACTE;
        }
    }

    private async generateLeadCode(): Promise<string> {
        return this.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' as any }, async (t) => {
            const prefix = 'L-';
            const lastLead = await this.leadModel.findOne({
                where: { code: { [Op.like]: `${prefix}%` } },
                order: [['code', 'DESC']],
                lock: true,
                transaction: t,
            });
            const nextNum = lastLead
                ? parseInt(lastLead.code.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(4, '0')}`;
        });
    }

    async create(dto: any, currentUser?: CurrentUser): Promise<Lead> {
        const code = await this.generateLeadCode();

        // COMMERCIAL users auto-assign leads to themselves
        if (currentUser?.role === 'COMMERCIAL' && !dto.assignedToId) {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) dto.assignedToId = employeeId;
        }

        const { contacts, needs, ...leadData } = dto;

        const saleStage = leadData.saleStage || SaleStage.PROSPECTION;
        const leadStatus = this.mapStageToStatus(saleStage);
        // New leads always start COLD regardless of what the client sends
        const priority = LeadPriority.COLD;

        // Set default success rate if not provided
        if (leadData.successRate === undefined || leadData.successRate === null) {
            switch (saleStage) {
                case SaleStage.PROSPECTION: leadData.successRate = 10; break;
                case SaleStage.QUALIFICATION: leadData.successRate = 25; break;
                case SaleStage.PROPOSITION: leadData.successRate = 50; break;
                case SaleStage.NEGOCIATION: leadData.successRate = 70; break;
                case SaleStage.CLOSING: leadData.successRate = 90; break;
                case SaleStage.GAGNE: leadData.successRate = 100; break;
                case SaleStage.PERDU: leadData.successRate = 0; break;
                default: leadData.successRate = 10;
            }
        }

        const lead = await this.leadModel.create({
            ...leadData,
            code,
            saleStage,
            leadStatus,
            priority,
        });

        // Bulk-create contacts
        if (Array.isArray(contacts) && contacts.length > 0) {
            await this.contactModel.bulkCreate(
                contacts.map((c: any, i: number) => ({
                    ...c,
                    leadId: lead.id,
                    order: i,
                    isPrimary: i === 0 ? true : (c.isPrimary ?? false),
                })),
            );
        }

        // Bulk-create needs
        if (Array.isArray(needs) && needs.length > 0) {
            await this.needModel.bulkCreate(
                needs.filter((n: any) => n.description?.trim()).map((n: any) => ({
                    description: n.description,
                    serviceId: n.serviceId || null,
                    leadId: lead.id,
                })),
            );
        }

        return this.findOne(lead.id);
    }

    async findAll(filters: {
        page?: number;
        limit?: number;
        search?: string;
        saleStage?: string;
        leadStatus?: string;
        priority?: string;
        leadType?: string;
        assignedToId?: string;
        dateFrom?: string;
        dateTo?: string;
    }, currentUser?: CurrentUser) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = {};

        if (filters.saleStage) where.saleStage = filters.saleStage;
        if (filters.leadStatus) where.leadStatus = filters.leadStatus;
        if (filters.priority) where.priority = filters.priority;
        if (filters.leadType) where.leadType = filters.leadType;
        if (filters.assignedToId) where.assignedToId = filters.assignedToId;
        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) where.createdAt[Op.gte] = new Date(filters.dateFrom);
            if (filters.dateTo) {
                const to = new Date(filters.dateTo);
                to.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = to;
            }
        }

        // COMMERCIAL users can only see their own leads
        if (currentUser?.role === 'COMMERCIAL') {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) where.assignedToId = employeeId;
        }

        // HOD sees only leads that reference at least one service from their department
        if (currentUser?.role === 'HEAD_OF_DEPARTMENT' && currentUser.departmentId) {
            const leadIds = await this.getLeadIdsByDepartment(currentUser.departmentId);
            where.id = { [Op.in]: leadIds.length ? leadIds : ['00000000-0000-0000-0000-000000000000'] };
        }

        if (filters.search) {
            where[Op.or] = [
                { company: { [Op.iLike]: `%${filters.search}%` } },
                { contact1Name: { [Op.iLike]: `%${filters.search}%` } },
                { contact2Name: { [Op.iLike]: `%${filters.search}%` } },
                { code: { [Op.iLike]: `%${filters.search}%` } },
                { city: { [Op.iLike]: `%${filters.search}%` } },
            ];
        }

        const { count, rows } = await this.leadModel.findAndCountAll({
            where,
            include: [
                { model: Employee, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] },
                { model: Client, attributes: ['id', 'name'], required: false },
                { model: LeadContact, order: [['order', 'ASC']] },
                { model: LeadNeed, include: [{ model: DepartmentService, attributes: ['id', 'name', 'price'] }] },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        return {
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        };
    }

    async findOne(id: string): Promise<Lead> {
        const lead = await this.leadModel.findByPk(id, {
            include: [
                { model: Employee, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName'] },
                { model: Client, attributes: ['id', 'name'], required: false },
                { model: LeadActivity, include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName'] }] },
                { model: LeadContact, order: [['order', 'ASC']] },
                { model: LeadNeed, include: [{ model: DepartmentService, attributes: ['id', 'name', 'price'] }] },
            ],
        });
        if (!lead) throw new NotFoundException('Lead not found');
        return lead;
    }

    async update(id: string, dto: any): Promise<Lead> {
        const lead = await this.findOne(id);
        // Once a lead is GAGNE (won), its stage cannot be changed
        if (lead.saleStage === SaleStage.GAGNE && dto.saleStage && dto.saleStage !== SaleStage.GAGNE) {
            throw new BadRequestException('Cannot change stage of a won lead');
        }

        const { contacts, needs, ...leadData } = dto;

        if (leadData.saleStage) {
            leadData.leadStatus = this.mapStageToStatus(leadData.saleStage);
            leadData.priority = this.mapStageToPriority(leadData.saleStage);

            if (leadData.saleStage === SaleStage.GAGNE) {
                leadData.successRate = 100;
            } else if (leadData.saleStage === SaleStage.PERDU) {
                leadData.successRate = 0;
            } else if (leadData.successRate === undefined || leadData.successRate === null) {
                switch (leadData.saleStage) {
                    case SaleStage.PROSPECTION: leadData.successRate = 10; break;
                    case SaleStage.QUALIFICATION: leadData.successRate = 25; break;
                    case SaleStage.PROPOSITION: leadData.successRate = 50; break;
                    case SaleStage.NEGOCIATION: leadData.successRate = 70; break;
                    case SaleStage.CLOSING: leadData.successRate = 90; break;
                }
            }
        }

        await lead.update(leadData);

        // Replace contacts if provided
        if (Array.isArray(contacts)) {
            await this.contactModel.destroy({ where: { leadId: id } });
            if (contacts.length > 0) {
                await this.contactModel.bulkCreate(
                    contacts.map((c: any, i: number) => ({
                        ...c,
                        leadId: id,
                        order: i,
                        isPrimary: i === 0 ? true : (c.isPrimary ?? false),
                    })),
                );
            }
        }

        // Replace needs if provided
        if (Array.isArray(needs)) {
            await this.needModel.destroy({ where: { leadId: id } });
            const validNeeds = needs.filter((n: any) => n.description?.trim());
            if (validNeeds.length > 0) {
                await this.needModel.bulkCreate(
                    validNeeds.map((n: any) => ({
                        description: n.description,
                        serviceId: n.serviceId || null,
                        leadId: id,
                    })),
                );
            }
        }

        return this.findOne(id);
    }

    async remove(id: string): Promise<{ success: boolean }> {
        const lead = await this.findOne(id);
        await lead.destroy();
        return { success: true };
    }

    async convertToClient(id: string, dto?: any): Promise<Lead> {
        const lead = await this.findOne(id);
        if (lead.clientId) throw new BadRequestException('Lead already converted to client');

        return this.sequelize.transaction(async (t) => {
            const client = await this.clientModel.create({
                name: dto?.name || lead.company,
                projectDescription: dto?.projectDescription || lead.clientNeeds || '',
                type: dto?.type || 'one_time',
                price: dto?.price || undefined,
                departmentId: dto?.departmentId || undefined,
                srs: dto?.srs || undefined,
                contract: dto?.contract || undefined,
            }, { transaction: t });

            await lead.update({
                clientId: client.id,
                convertedAt: new Date(),
                saleStage: SaleStage.GAGNE,
                leadStatus: LeadStatus.GAGNE,
                priority: LeadPriority.HOT,
                successRate: 100,
            }, { transaction: t });

            return this.findOne(id);
        });
    }

    async getStats(filters?: { dateFrom?: string; dateTo?: string; assignedToId?: string }, currentUser?: CurrentUser) {
        const where: any = {};
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) where.createdAt[Op.gte] = filters.dateFrom;
            if (filters.dateTo) where.createdAt[Op.lte] = filters.dateTo;
        }

        // Filter by specific commercial (assignedToId)
        if (filters?.assignedToId) {
            where.assignedToId = filters.assignedToId;
        }

        // COMMERCIAL users see only their own stats
        if (currentUser?.role === 'COMMERCIAL') {
            const employeeId = await this.getEmployeeIdByUserId(currentUser.userId);
            if (employeeId) where.assignedToId = employeeId;
        }

        // HOD sees only leads that reference at least one service from their department
        if (currentUser?.role === 'HEAD_OF_DEPARTMENT' && currentUser.departmentId) {
            const leadIds = await this.getLeadIdsByDepartment(currentUser.departmentId);
            where.id = { [Op.in]: leadIds.length ? leadIds : ['00000000-0000-0000-0000-000000000000'] };
        }

        const leads = await this.leadModel.findAll({ where });

        const byStage: Record<string, { count: number; value: number }> = {};
        Object.values(SaleStage).forEach(stage => {
            byStage[stage] = { count: 0, value: 0 };
        });

        const byStatus: Record<string, number> = {};
        Object.values(LeadStatus).forEach(status => {
            byStatus[status] = 0;
        });

        let totalPipelineValue = 0;
        let weightedPipelineValue = 0;
        let wonCount = 0;
        let lostCount = 0;
        let wonRevenue = 0;
        const bySource: Record<string, number> = {};
        const revenueTrendMap: Record<string, number> = {};

        leads.forEach(lead => {
            byStage[lead.saleStage].count++;
            byStage[lead.saleStage].value += Number(lead.potentialRevenue) || 0;
            byStatus[lead.leadStatus]++;

            // Count by leadType (source)
            const src = lead.leadType || 'AUTRE';
            bySource[src] = (bySource[src] || 0) + 1;

            if (lead.saleStage !== SaleStage.GAGNE && lead.saleStage !== SaleStage.PERDU) {
                totalPipelineValue += Number(lead.potentialRevenue) || 0;
                weightedPipelineValue += (Number(lead.potentialRevenue) || 0) * (lead.successRate || 0) / 100;
            }

            if (lead.leadStatus === LeadStatus.GAGNE) {
                wonCount++;
                wonRevenue += Number(lead.potentialRevenue) || 0;

                // Monthly revenue trend based on convertedAt or updatedAt
                const dateKey = lead.convertedAt || lead.updatedAt;
                if (dateKey) {
                    const d = new Date(dateKey);
                    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    revenueTrendMap[monthKey] = (revenueTrendMap[monthKey] || 0) + (Number(lead.potentialRevenue) || 0);
                }
            }
            if (lead.leadStatus === LeadStatus.PERDU) lostCount++;
        });

        // Build 12-month revenue trend array
        const now = new Date();
        const revenueTrend: { month: string; revenue: number }[] = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            revenueTrend.push({ month: monthNames[d.getMonth()], revenue: revenueTrendMap[key] || 0 });
        }

        return {
            totalLeads: leads.length,
            byStage,
            byStatus,
            bySource,
            revenueTrend,
            totalPipelineValue,
            weightedPipelineValue,
            wonCount,
            lostCount,
            winRate: (wonCount + lostCount) > 0
                ? Math.round(wonCount / (wonCount + lostCount) * 100)
                : 0,
            conversionRate: leads.length > 0
                ? Math.round(wonCount / leads.length * 100)
                : 0,
            averageDealSize: wonCount > 0
                ? Math.round(wonRevenue / wonCount)
                : 0,
        };
    }
}

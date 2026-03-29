import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { DepartmentService } from '../models/department-service.model';
import { Department } from '../models/department.model';
import { Project } from '../models/project.model';
import { LeadNeed } from '../models/lead-need.model';

@Injectable()
export class DepartmentServicesService {
    constructor(
        @InjectModel(DepartmentService)
        private departmentServiceModel: typeof DepartmentService,
        @InjectModel(Project)
        private projectModel: typeof Project,
        @InjectModel(LeadNeed)
        private leadNeedModel: typeof LeadNeed,
    ) { }

    create(createDto: any) {
        return this.departmentServiceModel.create(createDto);
    }

    findAll() {
        return this.departmentServiceModel.findAll({ include: [Department] });
    }

    findByDepartment(departmentId: string) {
        return this.departmentServiceModel.findAll({
            where: { departmentId },
            order: [['name', 'ASC']],
        });
    }

    findOne(id: string) {
        return this.departmentServiceModel.findByPk(id, { include: [Department] });
    }

    update(id: string, updateDto: any) {
        return this.departmentServiceModel.update(updateDto, {
            where: { id },
            returning: true,
        });
    }

    async remove(id: string) {
        const service = await this.departmentServiceModel.findByPk(id);
        if (service) {
            await service.destroy();
        }
    }

    async getServiceStats(from?: string, to?: string, departmentId?: string) {
        const dateWhere: any = {};
        if (from) dateWhere[Op.gte] = new Date(from);
        if (to) dateWhere[Op.lte] = new Date(to);
        const hasDateFilter = !!(from || to);

        // When scoped to a department, restrict to that department's services
        const serviceWhere: any = departmentId ? { departmentId } : {};

        // Count services used in projects (filtered by project createdAt)
        const projectWhere: any = hasDateFilter ? { createdAt: dateWhere } : {};
        if (departmentId) projectWhere.departmentId = departmentId;

        const projects = await this.projectModel.findAll({
            where: projectWhere,
            include: [{
                model: DepartmentService,
                attributes: ['id', 'name'],
                through: { attributes: [] },
                where: Object.keys(serviceWhere).length ? serviceWhere : undefined,
            }],
            attributes: ['id'],
        });

        const map = new Map<string, { name: string; projectCount: number; leadCount: number }>();
        for (const project of projects) {
            for (const svc of ((project as any).services || [])) {
                const entry = map.get(svc.id) ?? { name: svc.name, projectCount: 0, leadCount: 0 };
                entry.projectCount++;
                map.set(svc.id, entry);
            }
        }

        // Count services referenced in lead needs (filtered by createdAt)
        const leadNeeds = await this.leadNeedModel.findAll({
            where: {
                serviceId: { [Op.ne]: null },
                ...(hasDateFilter ? { createdAt: dateWhere } : {}),
            },
            include: [{
                model: DepartmentService,
                attributes: ['id', 'name'],
                where: Object.keys(serviceWhere).length ? serviceWhere : undefined,
                required: true,
            }],
            attributes: ['serviceId'],
        });

        for (const need of leadNeeds) {
            if (!need.serviceId || !(need as any).service) continue;
            const svc = (need as any).service;
            const entry = map.get(need.serviceId) ?? { name: svc.name, projectCount: 0, leadCount: 0 };
            entry.leadCount++;
            map.set(need.serviceId, entry);
        }

        return Array.from(map.entries())
            .map(([serviceId, { name, projectCount, leadCount }]) => ({
                serviceId,
                name,
                projectCount,
                leadCount,
                total: projectCount + leadCount,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }
}

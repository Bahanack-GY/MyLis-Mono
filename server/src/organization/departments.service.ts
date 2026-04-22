
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Department } from '../models/department.model';
import { DepartmentGoal } from '../models/department-goal.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Position } from '../models/position.model';
import { Project } from '../models/project.model';
import { Op } from 'sequelize';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL, CACHE_PATTERNS } from '../cache/cache.keys';

@Injectable()
export class DepartmentsService {
    private readonly logger = new Logger(DepartmentsService.name);

    constructor(
        @InjectModel(Department)
        private departmentModel: typeof Department,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(User)
        private userModel: typeof User,
        private cache: CacheService,
    ) { }

    private async setHeadRole(employeeId: string, role: 'HEAD_OF_DEPARTMENT' | 'EMPLOYEE') {
        const employee = await this.employeeModel.findByPk(employeeId);
        if (!employee) {
            this.logger.warn(`setHeadRole: employee ${employeeId} not found`);
            return;
        }
        const userId = employee.getDataValue('userId');
        if (!userId) {
            this.logger.warn(`setHeadRole: employee ${employeeId} has no userId`);
            return;
        }
        const [affected] = await this.userModel.update({ role }, { where: { id: userId } });
        this.logger.log(`setHeadRole: employee ${employeeId} → user ${userId} → role=${role} (${affected} row updated)`);
    }

    async create(createDepartmentDto: any) {
        const department = await this.departmentModel.create(createDepartmentDto);
        if (createDepartmentDto.headId) {
            await this.setHeadRole(createDepartmentDto.headId, 'HEAD_OF_DEPARTMENT');
        }
        await this.cache.invalidateByPattern(CACHE_PATTERNS.DEPARTMENTS);
        return department;
    }

    async update(id: string, updateDepartmentDto: any) {
        const department = await this.departmentModel.findByPk(id);
        if (!department) return null;

        if ('headId' in updateDepartmentDto && updateDepartmentDto.headId !== undefined && updateDepartmentDto.headId !== department.headId) {
            if (department.headId) {
                await this.setHeadRole(department.headId, 'EMPLOYEE');
            }
            if (updateDepartmentDto.headId) {
                await this.setHeadRole(updateDepartmentDto.headId, 'HEAD_OF_DEPARTMENT');
            }
        }

        await this.departmentModel.update(updateDepartmentDto, { where: { id } });
        await this.cache.invalidateByPattern(CACHE_PATTERNS.DEPARTMENTS);
        return this.findOne(id);
    }

    async findAll() {
        const cached = await this.cache.get<any[]>(CACHE_KEYS.DEPARTMENTS);
        if (cached) return cached;

        const rows = await this.departmentModel.findAll({
            include: [
                DepartmentGoal,
                { model: Employee, as: 'employees', include: [Position] },
                { model: Employee, as: 'head' },
                Project,
            ],
        });
        const result = rows.map(r => r.get({ plain: true }));
        await this.cache.set(CACHE_KEYS.DEPARTMENTS, result, CACHE_TTL.REFERENCE);
        return result;
    }

    async findAllPaginated(params: {
        search?: string;
        page: number;
        limit: number;
    }): Promise<{ rows: Department[]; count: number }> {
        const where: any = {};
        if (params.search) {
            where.name = { [Op.iLike]: `%${params.search}%` };
        }
        return this.departmentModel.findAndCountAll({
            where,
            include: [
                DepartmentGoal,
                { model: Employee, as: 'employees', include: [Position] },
                { model: Employee, as: 'head' },
                Project,
            ],
            limit: params.limit,
            offset: (params.page - 1) * params.limit,
            order: [['name', 'ASC']],
            distinct: true,
        });
    }

    async findOne(id: string) {
        const key = CACHE_KEYS.DEPARTMENT(id);
        const cached = await this.cache.get<any>(key);
        if (cached) return cached;

        const row = await this.departmentModel.findByPk(id, {
            include: [
                DepartmentGoal,
                { model: Employee, as: 'employees', include: [Position] },
                { model: Employee, as: 'head' },
                Project,
            ],
        });
        if (!row) return null;
        const plain = row.get({ plain: true });
        await this.cache.set(key, plain, CACHE_TTL.REFERENCE);
        return plain;
    }
}

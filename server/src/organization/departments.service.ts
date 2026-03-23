
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Department } from '../models/department.model';
import { DepartmentGoal } from '../models/department-goal.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { Position } from '../models/position.model';
import { Project } from '../models/project.model';

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
        return department;
    }

    async update(id: string, updateDepartmentDto: any) {
        const department = await this.departmentModel.findByPk(id);
        if (!department) return null;

        // If headId is changing, revert old head and set new head
        if ('headId' in updateDepartmentDto && updateDepartmentDto.headId !== undefined && updateDepartmentDto.headId !== department.headId) {
            if (department.headId) {
                await this.setHeadRole(department.headId, 'EMPLOYEE');
            }
            if (updateDepartmentDto.headId) {
                await this.setHeadRole(updateDepartmentDto.headId, 'HEAD_OF_DEPARTMENT');
            }
        }

        await this.departmentModel.update(updateDepartmentDto, { where: { id } });
        return this.findOne(id);
    }

    findAll() {
        return this.departmentModel.findAll({
            include: [
                DepartmentGoal,
                { model: Employee, as: 'employees', include: [Position] },
                { model: Employee, as: 'head' },
                Project,
            ],
        });
    }

    findOne(id: string) {
        return this.departmentModel.findByPk(id, {
            include: [
                DepartmentGoal,
                { model: Employee, as: 'employees', include: [Position] },
                { model: Employee, as: 'head' },
                Project,
            ],
        });
    }
}

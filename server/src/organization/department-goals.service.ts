import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DepartmentGoal } from '../models/department-goal.model';
import { Department } from '../models/department.model';

@Injectable()
export class DepartmentGoalsService {
    constructor(
        @InjectModel(DepartmentGoal)
        private departmentGoalModel: typeof DepartmentGoal,
    ) { }

    create(createGoalDto: any) {
        return this.departmentGoalModel.create(createGoalDto);
    }

    findAll() {
        return this.departmentGoalModel.findAll({ include: [Department] });
    }

    findByDepartment(departmentId: string) {
        return this.departmentGoalModel.findAll({
            where: { departmentId },
            order: [['year', 'DESC']],
        });
    }

    findByDepartmentAndYear(departmentId: string, year: number) {
        return this.departmentGoalModel.findOne({
            where: { departmentId, year },
        });
    }

    update(id: string, updateGoalDto: any) {
        return this.departmentGoalModel.update(updateGoalDto, {
            where: { id },
            returning: true,
        });
    }

    async remove(id: string) {
        const goal = await this.departmentGoalModel.findByPk(id);
        if (goal) {
            await goal.destroy();
        }
    }
}

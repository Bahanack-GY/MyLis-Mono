
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Formation } from '../models/formation.model';
import { Employee } from '../models/employee.model';

@Injectable()
export class FormationsService {
    constructor(
        @InjectModel(Formation)
        private formationModel: typeof Formation,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
    ) { }

    create(createFormationDto: any) {
        return this.formationModel.create(createFormationDto);
    }

    findAll() {
        return this.formationModel.findAll();
    }

    findOne(id: string) {
        return this.formationModel.findByPk(id);
    }

    async findByUserId(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        return this.findByEmployee(employee.id);
    }

    findByEmployee(employeeId: string) {
        return this.formationModel.findAll({ where: { employeeId } });
    }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DepartmentService } from '../models/department-service.model';
import { Department } from '../models/department.model';

@Injectable()
export class DepartmentServicesService {
    constructor(
        @InjectModel(DepartmentService)
        private departmentServiceModel: typeof DepartmentService,
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
}

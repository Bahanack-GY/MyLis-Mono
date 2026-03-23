import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TaskNature } from '../models/task-nature.model';

@Injectable()
export class TaskNaturesService {
    constructor(
        @InjectModel(TaskNature)
        private taskNatureModel: typeof TaskNature,
    ) {}

    create(dto: any) {
        return this.taskNatureModel.create(dto);
    }

    findAll() {
        return this.taskNatureModel.findAll({ order: [['name', 'ASC']] });
    }

    findOne(id: string) {
        return this.taskNatureModel.findByPk(id);
    }

    async update(id: string, dto: any) {
        const nature = await this.taskNatureModel.findByPk(id);
        if (!nature) return null;
        await nature.update(dto);
        return nature;
    }

    async remove(id: string) {
        const nature = await this.taskNatureModel.findByPk(id);
        if (nature) await nature.destroy();
    }
}

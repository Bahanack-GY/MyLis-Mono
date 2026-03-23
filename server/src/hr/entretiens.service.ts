
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Entretien } from '../models/entretien.model';

@Injectable()
export class EntretiensService {
    constructor(
        @InjectModel(Entretien)
        private entretienModel: typeof Entretien,
    ) { }

    create(createEntretienDto: any) {
        return this.entretienModel.create(createEntretienDto);
    }

    findAll() {
        return this.entretienModel.findAll();
    }

    findOne(id: string) {
        return this.entretienModel.findByPk(id);
    }

    findByEmployee(employeeId: string) {
        return this.entretienModel.findAll({ where: { employeeId } });
    }
}

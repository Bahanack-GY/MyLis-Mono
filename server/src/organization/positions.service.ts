
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Position } from '../models/position.model';

@Injectable()
export class PositionsService {
    constructor(
        @InjectModel(Position)
        private positionModel: typeof Position,
    ) { }

    create(createPositionDto: any) {
        return this.positionModel.create(createPositionDto);
    }

    findAll() {
        return this.positionModel.findAll();
    }

    findOne(id: string) {
        return this.positionModel.findByPk(id);
    }

    async update(id: string, dto: any) {
        const pos = await this.positionModel.findByPk(id);
        if (!pos) return null;
        await pos.update(dto);
        return pos;
    }

    async remove(id: string) {
        const pos = await this.positionModel.findByPk(id);
        if (pos) await pos.destroy();
    }
}

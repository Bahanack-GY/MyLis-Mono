
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Team } from '../models/team.model';
import { Employee } from '../models/employee.model';

@Injectable()
export class TeamsService {
    constructor(
        @InjectModel(Team)
        private teamModel: typeof Team,
    ) { }

    create(createTeamDto: any) {
        return this.teamModel.create(createTeamDto);
    }

    findAll() {
        return this.teamModel.findAll({ include: [Employee] });
    }

    findOne(id: string) {
        return this.teamModel.findByPk(id, { include: [Employee] });
    }
}

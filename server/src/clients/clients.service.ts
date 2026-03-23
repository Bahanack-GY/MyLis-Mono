import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Client } from '../models/client.model';
import { Project } from '../models/project.model';

@Injectable()
export class ClientsService {
    constructor(
        @InjectModel(Client)
        private clientModel: typeof Client,
    ) { }

    async findAll(): Promise<Client[]> {
        return this.clientModel.findAll({ include: [Project] });
    }

    async findOne(id: string): Promise<Client | null> {
        return this.clientModel.findByPk(id, { include: [Project] });
    }

    async create(createClientDto: any): Promise<Client> {
        return this.clientModel.create(createClientDto);
    }

    async update(id: string, updateClientDto: any): Promise<[number, Client[]]> {
        return this.clientModel.update(updateClientDto, { where: { id }, returning: true });
    }

    async remove(id: string): Promise<void> {
        const client = await this.findOne(id);
        if (client) {
            await client.destroy();
        }
    }

    async findByDepartment(departmentId: string): Promise<Client[]> {
        return this.clientModel.findAll({ where: { departmentId }, include: [Project] });
    }
}

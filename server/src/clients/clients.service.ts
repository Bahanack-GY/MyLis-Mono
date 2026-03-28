import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Client } from '../models/client.model';
import { Project } from '../models/project.model';
import { Op } from 'sequelize';

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

    async findAllPaginated(params: {
        departmentId?: string;
        search?: string;
        type?: string;
        page: number;
        limit: number;
    }): Promise<{ rows: Client[]; count: number }> {
        const where: any = {};
        if (params.departmentId) where.departmentId = params.departmentId;
        if (params.type && params.type !== 'all') where.type = params.type;
        if (params.search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${params.search}%` } },
                { projectDescription: { [Op.iLike]: `%${params.search}%` } },
            ];
        }
        return this.clientModel.findAndCountAll({
            where,
            include: [Project],
            limit: params.limit,
            offset: (params.page - 1) * params.limit,
            order: [['name', 'ASC']],
            distinct: true,
        });
    }
}

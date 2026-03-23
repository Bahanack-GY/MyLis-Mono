import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InvoiceTemplate } from '../models/invoice-template.model';

@Injectable()
export class InvoiceTemplatesService {
    constructor(
        @InjectModel(InvoiceTemplate)
        private templateModel: typeof InvoiceTemplate,
    ) { }

    async findByDepartment(departmentId: string): Promise<InvoiceTemplate | null> {
        return this.templateModel.findOne({ where: { departmentId } });
    }

    async upsert(departmentId: string, dto: any): Promise<InvoiceTemplate> {
        const existing = await this.templateModel.findOne({ where: { departmentId } });
        if (existing) {
            await existing.update(dto);
            return existing;
        }
        return this.templateModel.create({ ...dto, departmentId });
    }
}

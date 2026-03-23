
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sanction } from '../models/sanction.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SanctionsService {
    constructor(
        @InjectModel(Sanction)
        private sanctionModel: typeof Sanction,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) { }

    async create(createSanctionDto: any) {
        const sanction = await this.sanctionModel.create(createSanctionDto);

        // Send notification to the sanctioned employee
        const employee = await this.employeeModel.findByPk(createSanctionDto.employeeId);
        if (employee) {
            const userId = employee.getDataValue('userId');
            if (!userId) return sanction;
            const sanctionType = sanction.getDataValue('type');
            const reason = sanction.getDataValue('reason') || '';
            const TYPE_LABELS: Record<string, string> = {
                AVERTISSEMENT: 'Warning',
                BLAME: 'Written warning',
                MISE_A_PIED: 'Suspension',
                LICENCIEMENT: 'Termination',
            };
            const TYPE_LABELS_FR: Record<string, string> = {
                AVERTISSEMENT: 'Avertissement',
                BLAME: 'Blâme',
                MISE_A_PIED: 'Mise à pied',
                LICENCIEMENT: 'Licenciement',
            };
            const label = TYPE_LABELS[sanctionType] || sanctionType;
            const labelFr = TYPE_LABELS_FR[sanctionType] || sanctionType;

            await this.notificationsService.create({
                title: `New sanction: ${label}`,
                body: reason ? `You have received a sanction (${label}): ${reason}` : `You have received a sanction: ${label}.`,
                titleFr: `Nouvelle sanction : ${labelFr}`,
                bodyFr: reason ? `Vous avez reçu une sanction (${labelFr}) : ${reason}` : `Vous avez reçu une sanction : ${labelFr}.`,
                type: 'sanction',
                userId,
            });
        }

        return sanction;
    }

    findAll() {
        return this.sanctionModel.findAll({
            include: [{ model: User, as: 'issuedBy', attributes: ['id', 'email'] }],
            order: [['createdAt', 'DESC']],
        });
    }

    findOne(id: string) {
        return this.sanctionModel.findByPk(id, {
            include: [{ model: User, as: 'issuedBy', attributes: ['id', 'email'] }],
        });
    }

    findByEmployee(employeeId: string) {
        return this.sanctionModel.findAll({
            where: { employeeId },
            include: [{ model: User, as: 'issuedBy', attributes: ['id', 'email'] }],
            order: [['createdAt', 'DESC']],
        });
    }

    async findByUserId(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        const employeeId = employee.getDataValue('id');
        return this.sanctionModel.findAll({
            where: { employeeId },
            include: [{ model: User, as: 'issuedBy', attributes: ['id', 'email'] }],
            order: [['createdAt', 'DESC']],
        });
    }

    async remove(id: string) {
        const sanction = await this.sanctionModel.findByPk(id);
        if (sanction) {
            await sanction.destroy();
        }
    }
}

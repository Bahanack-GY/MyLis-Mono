
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PermissionRequest } from '../models/permission-request.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PermissionsService {
    constructor(
        @InjectModel(PermissionRequest) private permissionModel: typeof PermissionRequest,
        @InjectModel(Employee) private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) {}

    async create(dto: any, userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const duration = dto.durationHours ?? this.calcDuration(dto.startTime, dto.endTime);

        return this.permissionModel.create({
            employeeId: employee.getDataValue('id'),
            date: dto.date,
            startTime: dto.startTime,
            endTime: dto.endTime,
            durationHours: duration,
            reason: dto.reason,
            status: 'PENDING',
        });
    }

    async findAll(filters: { status?: string; employeeId?: string } = {}) {
        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (filters.employeeId) where.employeeId = filters.employeeId;

        return this.permissionModel.findAll({
            where,
            include: [
                {
                    model: Employee,
                    include: [{ model: User, attributes: ['role'] }],
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'departmentId'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findMyRequests(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        return this.permissionModel.findAll({
            where: { employeeId: employee.getDataValue('id') },
            include: [{
                model: User,
                as: 'approvedBy',
                attributes: ['id', 'email'],
                include: [{ model: Employee, attributes: ['firstName', 'lastName'] }],
            }],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string) {
        const req = await this.permissionModel.findByPk(id, {
            include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName'] }],
        });
        if (!req) throw new NotFoundException('Permission request not found');
        return req;
    }

    async approve(id: string, approverId: string) {
        const request = await this.findOne(id);
        if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

        await request.update({ status: 'APPROVED', approvedById: approverId, approvedAt: new Date() });

        const employee = await this.employeeModel.findByPk(request.employeeId, { include: [{ model: User }] });
        if (employee?.user?.id) {
            await this.notificationsService.create({
                userId: employee.user.id,
                title: 'Autorisation approuvée',
                body: `Votre demande d'autorisation pour le ${request.date} (${request.startTime}–${request.endTime}) a été approuvée.`,
                type: 'system',
            });
        }

        return request;
    }

    async reject(id: string, approverId: string, rejectionReason: string) {
        const request = await this.findOne(id);
        if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

        await request.update({ status: 'REJECTED', approvedById: approverId, rejectionReason, approvedAt: new Date() });

        const employee = await this.employeeModel.findByPk(request.employeeId, { include: [{ model: User }] });
        if (employee?.user?.id) {
            await this.notificationsService.create({
                userId: employee.user.id,
                title: 'Autorisation refusée',
                body: `Votre demande d'autorisation pour le ${request.date} a été refusée. Motif : ${rejectionReason}`,
                type: 'system',
            });
        }

        return request;
    }

    private calcDuration(startTime: string, endTime: string): number {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 10) / 10;
    }
}


import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { LeaveRequest } from '../models/leave-request.model';
import { LeaveBalance } from '../models/leave-balance.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeavesService {
    constructor(
        @InjectModel(LeaveRequest) private leaveRequestModel: typeof LeaveRequest,
        @InjectModel(LeaveBalance) private leaveBalanceModel: typeof LeaveBalance,
        @InjectModel(Employee) private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) {}

    async create(dto: any, userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');

        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (end < start) throw new BadRequestException('End date must be after start date');

        const numberOfDays = dto.numberOfDays || this.countWorkingDays(start, end);

        return this.leaveRequestModel.create({
            employeeId: employee.getDataValue('id'),
            type: dto.type,
            startDate: dto.startDate,
            endDate: dto.endDate,
            numberOfDays,
            reason: dto.reason || null,
            status: 'PENDING',
        });
    }

    async findAll(filters: { status?: string; employeeId?: string } = {}) {
        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (filters.employeeId) where.employeeId = filters.employeeId;

        return this.leaveRequestModel.findAll({
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
        return this.leaveRequestModel.findAll({
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
        const req = await this.leaveRequestModel.findByPk(id, {
            include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName'] }],
        });
        if (!req) throw new NotFoundException('Leave request not found');
        return req;
    }

    async approve(id: string, approverId: string) {
        const request = await this.findOne(id);
        if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

        await request.update({ status: 'APPROVED', approvedById: approverId, approvedAt: new Date() });

        const year = new Date(request.startDate).getFullYear();
        await this.incrementUsedDays(request.employeeId, year, request.numberOfDays);

        const employee = await this.employeeModel.findByPk(request.employeeId, { include: [{ model: User }] });
        if (employee?.user?.id) {
            await this.notificationsService.create({
                userId: employee.user.id,
                title: 'Congé approuvé',
                body: `Votre demande de congé du ${request.startDate} au ${request.endDate} a été approuvée.`,
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
                title: 'Congé refusé',
                body: `Votre demande de congé du ${request.startDate} au ${request.endDate} a été refusée. Motif : ${rejectionReason}`,
                type: 'system',
            });
        }

        return request;
    }

    async getBalance(employeeId: string, year: number) {
        let balance = await this.leaveBalanceModel.findOne({ where: { employeeId, year } });
        if (!balance) {
            balance = await this.leaveBalanceModel.create({ employeeId, year, totalDays: 18, usedDays: 0 });
        }
        return { ...balance.toJSON(), remainingDays: balance.totalDays - balance.usedDays };
    }

    async getMyBalance(userId: string, year: number) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) throw new NotFoundException('Employee not found');
        return this.getBalance(employee.getDataValue('id'), year);
    }

    async updateBalance(employeeId: string, year: number, totalDays: number) {
        const [balance] = await this.leaveBalanceModel.findOrCreate({
            where: { employeeId, year },
            defaults: { totalDays, usedDays: 0 },
        });
        if (balance.getDataValue('totalDays') !== totalDays) {
            await balance.update({ totalDays });
        }
        return { ...balance.toJSON(), remainingDays: balance.totalDays - balance.usedDays };
    }

    private async incrementUsedDays(employeeId: string, year: number, days: number) {
        const [balance] = await this.leaveBalanceModel.findOrCreate({
            where: { employeeId, year },
            defaults: { totalDays: 18, usedDays: 0 },
        });
        await balance.update({ usedDays: balance.usedDays + days });
    }

    private countWorkingDays(start: Date, end: Date): number {
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    }
}

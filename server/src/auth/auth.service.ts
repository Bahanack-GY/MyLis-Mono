
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Employee } from '../models/employee.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { Team } from '../models/team.model';
import { Project } from '../models/project.model';
import { Task } from '../models/task.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { User } from '../models/user.model';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(Task)
        private taskModel: typeof Task,
        @InjectModel(EmployeeBadge)
        private employeeBadgeModel: typeof EmployeeBadge,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneWithEmployee(email);
        if (user && (await bcrypt.compare(pass, user.passwordHash))) {
            // Block login for dismissed employees
            if (user.employee?.getDataValue('dismissed')) {
                return null;
            }
            const { passwordHash, ...result } = user['dataValues'];
            const departmentId = user.employee?.getDataValue('departmentId') || null;
            return { ...result, departmentId };
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role, departmentId: user.departmentId };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                departmentId: user.departmentId,
            }
        };
    }

    async register(registerDto: any) {
        return this.usersService.create({
            email: registerDto.email,
            password: registerDto.password,
            role: registerDto.role
        });
    }

    async getFullProfile(userId: string) {
        const user = await this.usersService.findOneById(userId);
        if (!user) return null;

        const employee = await this.employeeModel.findOne({
            where: { userId },
            include: [
                { model: Department, attributes: ['id', 'name'] },
                { model: Position, attributes: ['id', 'title'] },
                { model: Team, attributes: ['id'] },
                { model: Project, attributes: ['id'] },
            ],
        });

        const employeeId = employee?.getDataValue('id');
        let completedTasksCount = 0;
        if (employeeId) {
            completedTasksCount = await this.taskModel.count({
                where: { assignedToId: employeeId, state: 'COMPLETED' },
            });
        }

        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstLogin: user.firstLogin ?? false,
            departmentId: employee?.getDataValue('departmentId') || null,
            employeeId: employeeId || null,
            firstName: employee?.getDataValue('firstName') || '',
            lastName: employee?.getDataValue('lastName') || '',
            phoneNumber: employee?.getDataValue('phoneNumber') || '',
            avatarUrl: employee?.getDataValue('avatarUrl') || '',
            address: employee?.getDataValue('address') || '',
            birthDate: employee?.getDataValue('birthDate') || null,
            hireDate: employee?.getDataValue('hireDate') || null,
            skills: employee?.getDataValue('skills') || [],
            departmentName: employee?.department?.getDataValue('name') || '',
            positionTitle: employee?.position?.getDataValue('title') || '',
            projectsCount: employee?.projects?.length ?? 0,
            educationDocs: employee?.getDataValue('educationDocs') || [],
            points: employee?.getDataValue('points') || 0,
            completedTasksCount,
        };
    }

    async markFirstLoginDone(userId: string) {
        const user = await this.usersService.findOneById(userId);
        if (!user) return null;
        await user.update({ firstLogin: false });
        return { success: true };
    }

    async getMyBadges(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        return this.employeeBadgeModel.findAll({
            where: { employeeId: employee.getDataValue('id') },
            order: [['badgeNumber', 'ASC']],
        });
    }

    async updateProfile(userId: string, dto: any) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return null;

        if (dto.email) {
            await this.usersService.updateEmail(userId, dto.email);
        }

        const allowed: Record<string, any> = {};
        if (dto.firstName !== undefined) allowed.firstName = dto.firstName;
        if (dto.lastName !== undefined) allowed.lastName = dto.lastName;
        if (dto.phoneNumber !== undefined) allowed.phoneNumber = dto.phoneNumber;
        if (dto.address !== undefined) allowed.address = dto.address;
        if (dto.birthDate !== undefined) allowed.birthDate = dto.birthDate;
        if (dto.avatarUrl !== undefined) allowed.avatarUrl = dto.avatarUrl;
        if (dto.skills !== undefined) allowed.skills = dto.skills;
        if (dto.educationDocs !== undefined) allowed.educationDocs = dto.educationDocs;

        await this.employeeModel.update(allowed, { where: { id: employee.id } });
        return this.getFullProfile(userId);
    }
}

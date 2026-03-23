
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { Transaction } from 'sequelize';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User)
        private userModel: typeof User,
    ) { }

    async findOne(email: string): Promise<User | null> {
        return this.userModel.findOne({ where: { email } });
    }

    async findOneWithEmployee(email: string): Promise<User | null> {
        return this.userModel.findOne({
            where: { email },
            include: [{ model: Employee, attributes: ['id', 'departmentId', 'dismissed'] }],
        });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.userModel.findByPk(id);
    }

    async updateEmail(userId: string, email: string): Promise<void> {
        await this.userModel.update({ email }, { where: { id: userId } });
    }

    async changePassword(userId: string, newPassword: string): Promise<void> {
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await this.userModel.update({ passwordHash }, { where: { id: userId } });
    }

    async verifyPassword(userId: string, password: string): Promise<boolean> {
        const user = await this.userModel.findByPk(userId);
        if (!user) return false;
        return bcrypt.compare(password, user.passwordHash);
    }

    async create(userData: { email: string; password: string; role?: string; firstName?: string; lastName?: string }, options?: { transaction?: Transaction }): Promise<User> {
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(userData.password, salt);
        return this.userModel.create({
            email: userData.email,
            passwordHash,
            role: userData.role || 'EMPLOYEE',
        }, options);
    }
}

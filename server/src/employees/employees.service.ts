
import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Employee } from '../models/employee.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { User } from '../models/user.model';
import { Department } from '../models/department.model';
import { Position } from '../models/position.model';
import { Task } from '../models/task.model';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Op, literal } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class EmployeesService {
    constructor(
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(EmployeeBadge)
        private employeeBadgeModel: typeof EmployeeBadge,
        @InjectModel(Task)
        private taskModel: typeof Task,
        @InjectConnection()
        private sequelize: Sequelize,
        private usersService: UsersService,
        private notificationsService: NotificationsService,
    ) { }

    async findAll(departmentId?: string): Promise<Employee[]> {
        const where: any = {};
        if (departmentId) where.departmentId = departmentId;
        return this.employeeModel.findAll({
            where,
            include: [User, Department, Position],
        });
    }

    async findOne(id: string): Promise<Employee | null> {
        return this.employeeModel.findByPk(id, {
            include: [User, Department, Position],
        });
    }

    async create(createEmployeeDto: any): Promise<Employee> {
        // Hash password before transaction to avoid holding lock during slow bcrypt
        let existingUser = await this.usersService.findOne(createEmployeeDto.email);

        // 1 & 2: Create User + Employee atomically
        const employee = await this.sequelize.transaction(async (t) => {
            let user = existingUser;
            if (!user) {
                const password = createEmployeeDto.password || 'ChangeMe123!';
                user = await this.usersService.create({
                    email: createEmployeeDto.email,
                    password,
                    role: createEmployeeDto.userRole || 'EMPLOYEE',
                    firstName: createEmployeeDto.firstName,
                    lastName: createEmployeeDto.lastName,
                }, { transaction: t });
            }

            return this.employeeModel.create({
                ...createEmployeeDto,
                userId: user.id,
            }, { transaction: t });
        });

        // 3. Notify department members after commit
        if (createEmployeeDto.departmentId) {
            const colleagues = await this.employeeModel.findAll({
                where: {
                    departmentId: createEmployeeDto.departmentId,
                    dismissed: false,
                    id: { [Op.ne]: employee.id },
                },
                attributes: ['userId'],
            });
            const empName = `${createEmployeeDto.firstName || ''} ${createEmployeeDto.lastName || ''}`.trim() || 'A new colleague';
            const notifications = colleagues
                .filter(c => c.userId)
                .map(c => ({
                    title: 'New team member',
                    body: `${empName} has joined your department`,
                    titleFr: 'Nouveau membre de l\'équipe',
                    bodyFr: `${empName} a rejoint votre département`,
                    type: 'system' as const,
                    userId: c.userId,
                }));
            if (notifications.length > 0) {
                await this.notificationsService.createMany(notifications);
            }
        }

        return employee;
    }

    async changeEmployeePassword(id: string, newPassword: string): Promise<void> {
        const employee = await this.employeeModel.findByPk(id);
        if (!employee?.userId) throw new Error('Employee user not found');
        await this.usersService.changePassword(employee.userId, newPassword);
    }

    async update(id: string, updateEmployeeDto: any): Promise<[number, Employee[]]> {
        const { email, ...employeeFields } = updateEmployeeDto;
        if (email) {
            const employee = await this.employeeModel.findByPk(id);
            if (employee?.userId) {
                await this.usersService.updateEmail(employee.userId, email);
            }
        }
        return this.employeeModel.update(employeeFields, {
            where: { id },
            returning: true,
        });
    }

    async remove(id: string): Promise<void> {
        const employee = await this.findOne(id);
        if (employee) {
            await employee.destroy();
        }
    }

    async dismiss(id: string): Promise<Employee | null> {
        const employee = await this.employeeModel.findByPk(id);
        if (!employee) return null;
        employee.dismissed = true;
        employee.dismissedAt = new Date();
        await employee.save();
        return employee.reload({ include: [User, Department, Position] });
    }

    async reinstate(id: string): Promise<Employee | null> {
        const employee = await this.employeeModel.findByPk(id);
        if (!employee) return null;
        employee.dismissed = false;
        employee.dismissedAt = null;
        await employee.save();
        return employee.reload({ include: [User, Department, Position] });
    }

    async getEmployeeStats(id: string) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Weekly Activity
        const weeklyTasks = await this.taskModel.findAll({
            where: {
                assignedToId: id,
                state: 'COMPLETED',
                updatedAt: {
                    [Op.between]: [startOfWeek, endOfWeek]
                }
            }
        });

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyActivity = days.map(day => ({ name: day, hours: 0, active: false }));

        weeklyTasks.forEach(task => {
            const dayIndex = new Date(task.updatedAt).getDay(); // 0 is Sunday
            const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Map to 0-6 (Mon-Sun)

            // Estimate duration: if strict time tracking isn't available, assume 2 hours per task or diff
            let duration = 2;
            if (task.startTime && task.endTime) {
                // simple parse if HH:mm
                const [sh, sm] = task.startTime.split(':').map(Number);
                const [eh, em] = task.endTime.split(':').map(Number);
                duration = (eh + em / 60) - (sh + sm / 60);
            }
            if (duration < 0) duration += 24;

            weeklyActivity[mappedIndex].hours += Math.round(duration * 10) / 10;
            weeklyActivity[mappedIndex].active = true;
        });

        // Current Productivity (Yearly)
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const yearlyTasks = await this.taskModel.findAll({
            where: {
                assignedToId: id,
                createdAt: {
                    [Op.gte]: startOfYear
                }
            }
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const productivityData = months.map((m, i) => {
            if (i > now.getMonth()) return { month: m, value: 0 };

            const monthTasks = yearlyTasks.filter(t => new Date(t.createdAt).getMonth() === i);
            const total = monthTasks.length;
            const completed = monthTasks.filter(t => t.state === 'COMPLETED').length;

            return {
                month: m,
                value: total > 0 ? Math.round((completed / total) * 100) : 0
            };
        });

        const employee = await this.employeeModel.findByPk(id);

        return {
            weeklyActivity,
            productivityData,
            points: employee?.getDataValue('points') || 0,
        };
    }

    async getLeaderboard(limit: number = 5) {
        const employees = await this.employeeModel.findAll({
            where: { dismissed: false },
            order: [['points', 'DESC']],
            limit,
            include: [User, Department, Position],
        });

        return employees.map((e, index) => {
            const plain = e.get({ plain: true }) as any;
            return {
                id: plain.id,
                rank: index + 1,
                firstName: plain.firstName || '',
                lastName: plain.lastName || '',
                avatarUrl: plain.avatarUrl || null,
                department: plain.department?.name || '',
                positionTitle: plain.position?.title || '',
                points: plain.points || 0,
            };
        });
    }

    async getEmployeeBadges(employeeId: string): Promise<EmployeeBadge[]> {
        return this.employeeBadgeModel.findAll({
            where: { employeeId },
            order: [['badgeNumber', 'ASC']],
        });
    }

    async getTodayBirthdays() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const employees = await this.employeeModel.findAll({
            where: {
                dismissed: false,
                birthDate: { [Op.ne]: null },
                [Op.and]: [
                    literal(`EXTRACT(MONTH FROM "birthDate") = ${month}`),
                    literal(`EXTRACT(DAY FROM "birthDate") = ${day}`),
                ],
            },
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'birthDate'],
            include: [{ model: Department, attributes: ['name'] }],
        });

        return employees.map(e => {
            const plain = e.get({ plain: true }) as any;
            return {
                id: plain.id,
                firstName: plain.firstName || '',
                lastName: plain.lastName || '',
                avatarUrl: plain.avatarUrl || null,
                departmentName: plain.department?.name || '',
            };
        });
    }
}


import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Employee } from '../models/employee.model';
import { EmployeeBadge } from '../models/employee-badge.model';
import { Task } from '../models/task.model';
import {
    POINTS_BY_DIFFICULTY,
    SPEED_BONUS_LIGHTNING,
    SPEED_BONUS_EARLY,
    SPEED_BONUS_ONTIME,
    SPEED_PENALTY_LATE,
    STREAK_BONUS_3,
    STREAK_BONUS_5,
    STREAK_BONUS_7,
    BADGE_DEFINITIONS,
} from './gamification.constants';

export interface GamificationResult {
    pointsEarned: number;
    totalPoints: number;
    breakdown: {
        base: number;
        speedBonus: number;
        streakBonus: number;
    };
    newBadge?: {
        badgeNumber: number;
        title: string;
        milestone: number;
    };
}

@Injectable()
export class GamificationService {
    constructor(
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectModel(EmployeeBadge)
        private employeeBadgeModel: typeof EmployeeBadge,
        @InjectModel(Task)
        private taskModel: typeof Task,
    ) { }

    async processTaskCompletion(employeeId: string, task: Task, transaction?: Transaction): Promise<GamificationResult> {
        // 1. Base points by difficulty
        const difficulty = task.getDataValue('difficulty') || 'MEDIUM';
        const base = POINTS_BY_DIFFICULTY[difficulty] ?? 10;
        let pointsEarned = base;

        // 2. Speed bonus/penalty (completedAt vs dueDate)
        let speedBonus = 0;
        const dueDate = task.getDataValue('dueDate');
        const completedAt = task.getDataValue('completedAt') || new Date();

        if (dueDate) {
            const due = new Date(dueDate);
            const completed = new Date(completedAt);
            const diffDays = (due.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24);

            if (diffDays >= 5) {
                speedBonus = SPEED_BONUS_LIGHTNING; // 5+ days early
            } else if (diffDays >= 2) {
                speedBonus = SPEED_BONUS_EARLY;     // 2–4 days early
            } else if (diffDays >= 0) {
                speedBonus = SPEED_BONUS_ONTIME;    // on time (0–1 days)
            } else if (diffDays < -3) {
                speedBonus = -SPEED_PENALTY_LATE;   // 3+ days late
            }
            // 0 to -3 days late: no bonus, no penalty
        }

        pointsEarned = Math.max(1, pointsEarned + speedBonus);

        // 3. Weekly streak bonus
        // Count tasks completed by this employee in the last 7 days
        // (completedAt is already set on the task before this method is called)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyCount = await this.taskModel.count({
            where: {
                assignedToId: employeeId,
                state: 'COMPLETED',
                completedAt: { [Op.gte]: weekAgo },
            },
            transaction,
        });

        let streakBonus = 0;
        if (weeklyCount === 7) {
            streakBonus = STREAK_BONUS_7;
        } else if (weeklyCount === 5) {
            streakBonus = STREAK_BONUS_5;
        } else if (weeklyCount === 3) {
            streakBonus = STREAK_BONUS_3;
        }

        pointsEarned += streakBonus;

        // 4. Update employee points
        const employee = await this.employeeModel.findByPk(employeeId, { transaction });
        const currentPoints = employee?.getDataValue('points') || 0;
        const newTotal = currentPoints + pointsEarned;
        await employee?.update({ points: newTotal }, { transaction });

        // 5. Badge milestone check (by total completed tasks)
        const completedCount = await this.taskModel.count({
            where: { assignedToId: employeeId, state: 'COMPLETED' },
            transaction,
        });

        let newBadge: GamificationResult['newBadge'] = undefined;
        const badgeDef = BADGE_DEFINITIONS.find(b => b.milestone === completedCount);
        if (badgeDef) {
            const existing = await this.employeeBadgeModel.findOne({
                where: { employeeId, badgeNumber: badgeDef.badgeNumber },
                transaction,
            });
            if (!existing) {
                await this.employeeBadgeModel.create({
                    employeeId,
                    badgeNumber: badgeDef.badgeNumber,
                    title: badgeDef.title,
                    milestone: badgeDef.milestone,
                }, { transaction });
                newBadge = {
                    badgeNumber: badgeDef.badgeNumber,
                    title: badgeDef.title,
                    milestone: badgeDef.milestone,
                };
            }
        }

        return {
            pointsEarned,
            totalPoints: newTotal,
            breakdown: { base, speedBonus, streakBonus },
            newBadge,
        };
    }

    async getEmployeeBadges(employeeId: string): Promise<EmployeeBadge[]> {
        return this.employeeBadgeModel.findAll({
            where: { employeeId },
            order: [['badgeNumber', 'ASC']],
        });
    }
}

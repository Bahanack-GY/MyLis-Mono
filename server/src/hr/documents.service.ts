
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document } from '../models/document.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';
import { join } from 'path';
import { readdirSync, statSync, unlink } from 'fs';
import { Op } from 'sequelize';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectModel(Document)
        private documentModel: typeof Document,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        private notificationsService: NotificationsService,
    ) { }

    getStorageInfo() {
        const uploadsDir = join(process.cwd(), 'uploads');
        let totalBytes = 0;
        let fileCount = 0;
        const getDirSize = (dir: string) => {
            try {
                const entries = readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);
                    if (entry.isDirectory()) {
                        getDirSize(fullPath);
                    } else {
                        totalBytes += statSync(fullPath).size;
                        fileCount++;
                    }
                }
            } catch { /* directory may not exist yet */ }
        };
        getDirSize(uploadsDir);
        return { totalBytes, fileCount };
    }

    async create(createDocumentDto: any) {
        if (!createDocumentDto.employeeId && createDocumentDto.uploadedById) {
            const employee = await this.employeeModel.findOne({
                where: { userId: createDocumentDto.uploadedById },
                attributes: ['id'],
            });
            if (employee) {
                createDocumentDto.employeeId = employee.getDataValue('id');
            }
        }
        const doc = await this.documentModel.create(createDocumentDto);

        // Notify the employee if a document was uploaded for them (by someone else)
        if (createDocumentDto.employeeId) {
            const targetEmployee = await this.employeeModel.findByPk(createDocumentDto.employeeId, { attributes: ['userId'] });
            if (targetEmployee && targetEmployee.userId && targetEmployee.userId !== createDocumentDto.uploadedById) {
                await this.notificationsService.create({
                    title: 'New document',
                    body: `A new document "${createDocumentDto.name || 'Untitled'}" has been added to your file`,
                    titleFr: 'Nouveau document',
                    bodyFr: `Un nouveau document "${createDocumentDto.name || 'Sans titre'}" a été ajouté à votre dossier`,
                    type: 'document',
                    userId: targetEmployee.userId,
                });
            }
        }

        return doc;
    }

    findAll() {
        return this.documentModel.findAll({
            include: [
                { model: User, as: 'uploadedBy', attributes: ['id', 'email'] },
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    findOne(id: string) {
        return this.documentModel.findByPk(id, {
            include: [
                { model: User, as: 'uploadedBy', attributes: ['id', 'email'] },
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
            ],
        });
    }

    async remove(id: string) {
        const doc = await this.documentModel.findByPk(id);
        if (!doc) return null;
        const filePath: string | null = doc.getDataValue('filePath') || doc.getDataValue('url') || null;
        await doc.destroy();
        // Delete physical file from disk (non-blocking, ignore errors)
        if (filePath) {
            const absPath = filePath.startsWith('/uploads/')
                ? join(process.cwd(), filePath)
                : filePath;
            unlink(absPath, () => { /* ignore */ });
        }
        return { success: true };
    }

    findByUser(userId: string) {
        return this.documentModel.findAll({
            where: { uploadedById: userId },
            include: [
                { model: User, as: 'uploadedBy', attributes: ['id', 'email'] },
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findByDepartment(departmentId: string) {
        const employees = await this.employeeModel.findAll({
            where: { departmentId },
            attributes: ['id'],
        });
        const employeeIds = employees.map(e => e.getDataValue('id'));
        if (employeeIds.length === 0) return [];

        return this.documentModel.findAll({
            where: { employeeId: { [Op.in]: employeeIds } },
            include: [
                { model: User, as: 'uploadedBy', attributes: ['id', 'email'] },
                { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    }
}

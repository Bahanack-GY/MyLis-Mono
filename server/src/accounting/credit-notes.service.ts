import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { CreditNote } from '../models/credit-note.model';
import { Invoice } from '../models/invoice.model';
import { JournalEngineService } from './journal-engine.service';

@Injectable()
export class CreditNotesService {
    constructor(
        @InjectModel(CreditNote)
        private creditNoteModel: typeof CreditNote,
        @InjectModel(Invoice)
        private invoiceModel: typeof Invoice,
        @InjectConnection()
        private sequelize: Sequelize,
        private journalEngine: JournalEngineService,
    ) {}

    private async generateNumber(): Promise<string> {
        return this.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' as any }, async (t) => {
            const year = new Date().getFullYear();
            const prefix = `AV-${year}-`;
            const last = await this.creditNoteModel.findOne({
                where: { creditNoteNumber: { [Op.like]: `${prefix}%` } },
                order: [['creditNoteNumber', 'DESC']],
                lock: true,
                transaction: t,
            });
            const nextNum = last
                ? parseInt(last.creditNoteNumber.replace(prefix, ''), 10) + 1
                : 1;
            return `${prefix}${String(nextNum).padStart(4, '0')}`;
        });
    }

    async findAll(invoiceId?: string) {
        const where: any = {};
        if (invoiceId) where.invoiceId = invoiceId;

        return this.creditNoteModel.findAll({
            where,
            include: [{ model: Invoice, attributes: ['id', 'invoiceNumber', 'total'] }],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string) {
        const note = await this.creditNoteModel.findByPk(id, {
            include: [Invoice],
        });
        if (!note) throw new NotFoundException('Credit note not found');
        return note;
    }

    async create(dto: any, userId: string) {
        const invoice = await this.invoiceModel.findByPk(dto.invoiceId);
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status === 'CREATED') {
            throw new BadRequestException('Cannot create a credit note for an unprocessed invoice');
        }

        // Calculate tax on credit note amount
        const amount = Number(dto.amount);
        const taxRate = Number(invoice.taxRate) || 0;
        const taxAmount = Math.round(amount * taxRate) / 100;
        const total = amount + taxAmount;

        if (total > Number(invoice.total)) {
            throw new BadRequestException('Credit note total cannot exceed the original invoice total');
        }

        const creditNoteNumber = await this.generateNumber();

        return this.creditNoteModel.create({
            creditNoteNumber,
            invoiceId: dto.invoiceId,
            reason: dto.reason,
            amount,
            taxAmount,
            total,
            status: 'DRAFT',
            createdByUserId: userId,
        } as any);
    }

    async validate(id: string, userId: string) {
        const note = await this.findOne(id);
        if (note.status === 'VALIDATED') return note;
        if (note.status !== 'DRAFT') {
            throw new BadRequestException('Can only validate DRAFT credit notes');
        }

        await note.update({ status: 'VALIDATED', validatedAt: new Date() });

        // Auto-generate reversal journal entry
        const invoice = await this.invoiceModel.findByPk(note.invoiceId);
        if (invoice) {
            await this.journalEngine.onCreditNoteValidated(note, invoice, userId);
        }

        return this.findOne(id);
    }
}

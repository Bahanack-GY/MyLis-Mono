
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as fs from 'fs';
import { Meeting } from '../models/meeting.model';
import { MeetingParticipant } from '../models/meeting-participant.model';
import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MeetingsService {
    private readonly ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    private readonly ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
    private readonly whisperUrl = process.env.WHISPER_URL || 'http://host.docker.internal:9001';

    constructor(
        @InjectModel(Meeting)
        private meetingModel: typeof Meeting,
        @InjectModel(MeetingParticipant)
        private meetingParticipantModel: typeof MeetingParticipant,
        @InjectModel(Employee)
        private employeeModel: typeof Employee,
        @InjectConnection()
        private sequelize: Sequelize,
        private notificationsService: NotificationsService,
    ) { }

    async create(dto: any, userId: string) {
        const { participantIds, ...meetingData } = dto;
        const meeting = await this.sequelize.transaction(async (t) => {
            const m = await this.meetingModel.create({ ...meetingData, organizerId: userId }, { transaction: t });
            if (participantIds?.length) {
                const rows = participantIds.map((employeeId: string) => ({ meetingId: m.id, employeeId }));
                await this.meetingParticipantModel.bulkCreate(rows, { transaction: t });
            }
            return m;
        });

        // Notify participants after commit
        if (participantIds?.length) {
            const employees = await this.employeeModel.findAll({ where: { id: participantIds }, attributes: ['id', 'userId'] });
            const notifications = employees
                .filter(e => e.getDataValue('userId'))
                .map(e => ({
                    title: 'New Meeting Invitation',
                    body: `You have been invited to "${meetingData.title}"`,
                    titleFr: 'Nouvelle invitation à une réunion',
                    bodyFr: `Vous avez été invité(e) à "${meetingData.title}"`,
                    type: 'meeting',
                    userId: e.getDataValue('userId'),
                }));
            if (notifications.length) await this.notificationsService.createMany(notifications);
        }

        return this.findOne(meeting.id);
    }

    async findAll(departmentId?: string) {
        const participantInclude: any = {
            model: Employee,
            as: 'participants',
            attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'departmentId'],
            through: { attributes: ['attended'] },
        };
        if (departmentId) {
            participantInclude.where = { departmentId };
            participantInclude.required = true;
        }
        return this.meetingModel.findAll({
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'email'] },
                { model: Employee, as: 'secretary', attributes: ['id', 'firstName', 'lastName'] },
                participantInclude,
            ],
            order: [['date', 'DESC'], ['startTime', 'DESC']],
        });
    }

    async findByUserId(userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId } });
        if (!employee) return [];
        const employeeId = employee.getDataValue('id');
        const participantRows = await this.meetingParticipantModel.findAll({
            where: { employeeId },
            attributes: ['meetingId'],
        });
        const meetingIds = participantRows.map(r => r.getDataValue('meetingId'));
        if (!meetingIds.length) return [];
        return this.meetingModel.findAll({
            where: { id: meetingIds },
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'email'] },
                { model: Employee, as: 'secretary', attributes: ['id', 'firstName', 'lastName'] },
                {
                    model: Employee,
                    as: 'participants',
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'departmentId'],
                    through: { attributes: ['attended'] },
                },
            ],
            order: [['date', 'DESC'], ['startTime', 'DESC']],
        });
    }

    async findOne(id: string) {
        return this.meetingModel.findByPk(id, {
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'email'] },
                { model: Employee, as: 'secretary', attributes: ['id', 'firstName', 'lastName'] },
                {
                    model: Employee,
                    as: 'participants',
                    attributes: ['id', 'firstName', 'lastName', 'avatarUrl'],
                    through: { attributes: ['attended'] },
                },
            ],
        });
    }

    async update(id: string, dto: any) {
        const { participantIds, ...meetingData } = dto;
        await this.sequelize.transaction(async (t) => {
            await this.meetingModel.update(meetingData, { where: { id }, transaction: t });
            if (participantIds !== undefined) {
                await this.meetingParticipantModel.destroy({ where: { meetingId: id }, transaction: t });
                if (participantIds.length) {
                    const rows = participantIds.map((employeeId: string) => ({ meetingId: id, employeeId }));
                    await this.meetingParticipantModel.bulkCreate(rows, { transaction: t });
                }
            }
        });
        return this.findOne(id);
    }

    async remove(id: string) {
        await this.sequelize.transaction(async (t) => {
            await this.meetingParticipantModel.destroy({ where: { meetingId: id }, transaction: t });
            await this.meetingModel.destroy({ where: { id }, transaction: t });
        });
    }

    async startMeeting(id: string, secretaryId: string, userId: string) {
        const meeting = await this.meetingModel.findByPk(id);
        if (!meeting) throw new NotFoundException('Meeting not found');
        if (meeting.organizerId !== userId) throw new ForbiddenException('Only the organizer can start the meeting');
        if (meeting.status !== 'scheduled') throw new BadRequestException('Meeting is not in scheduled state');

        await meeting.update({ status: 'in_progress', secretaryId });

        // Notify secretary via socket
        const secretaryEmployee = await this.employeeModel.findByPk(secretaryId, { attributes: ['id', 'userId'] });
        if (secretaryEmployee?.getDataValue('userId')) {
            this.notificationsService.emitToUser(secretaryEmployee.getDataValue('userId'), 'meeting:started', {
                meetingId: id,
                meetingTitle: meeting.title,
            });
        }

        return this.findOne(id);
    }

    async endMeeting(id: string, userId: string) {
        const meeting = await this.meetingModel.findByPk(id);
        if (!meeting) throw new NotFoundException('Meeting not found');
        if (meeting.organizerId !== userId) throw new ForbiddenException('Only the organizer can end the meeting');
        if (meeting.status !== 'in_progress') throw new BadRequestException('Meeting is not in progress');

        await meeting.update({ status: 'completed' });

        // Notify secretary via socket to stop recording
        if (meeting.secretaryId) {
            const secretaryEmployee = await this.employeeModel.findOne({
                where: { id: meeting.secretaryId },
                attributes: ['id', 'userId'],
            });
            if (secretaryEmployee?.getDataValue('userId')) {
                this.notificationsService.emitToUser(secretaryEmployee.getDataValue('userId'), 'meeting:ended', {
                    meetingId: id,
                });
            }
        }

        return this.findOne(id);
    }

    async attendMeeting(id: string, userId: string) {
        const employee = await this.employeeModel.findOne({ where: { userId }, attributes: ['id'] });
        if (!employee) throw new NotFoundException('Employee not found');

        const participantRow = await this.meetingParticipantModel.findOne({
            where: { meetingId: id, employeeId: employee.id },
        });
        if (!participantRow) throw new NotFoundException('You are not a participant of this meeting');

        await participantRow.update({ attended: true });
        return this.findOne(id);
    }

    async processRecording(id: string, filePath: string) {
        const meeting = await this.findOne(id);
        if (!meeting) throw new NotFoundException('Meeting not found');

        let transcript = '';

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const blob = new Blob([fileBuffer], { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const whisperResponse = await fetch(`${this.whisperUrl}/transcribe`, {
                method: 'POST',
                body: formData,
            });

            if (whisperResponse.ok) {
                const data = await whisperResponse.json() as { text: string };
                transcript = (data.text || '').trim();
                console.log(`[Meetings] Whisper transcript length: ${transcript.length} chars`);
            } else {
                const errText = await whisperResponse.text();
                console.error(`[Meetings] Ollama /api/transcribe returned ${whisperResponse.status}: ${errText}`);
            }
        } catch (err) {
            console.error('[Meetings] Whisper transcription failed:', err);
        } finally {
            try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        }

        // Save transcript (may be empty if Whisper failed)
        await this.meetingModel.update({ transcript }, { where: { id } });

        // Always attempt report generation via Ollama (with or without transcript)
        const participantNames = (meeting.participants || [])
            .map((p: any) => `${p.firstName} ${p.lastName}`)
            .join(', ');

        const secretary = meeting.secretary
            ? `${(meeting.secretary as any).firstName} ${(meeting.secretary as any).lastName}`
            : 'Unknown';

        const organizer = meeting.organizer
            ? (meeting.organizer as any).email
            : 'Unknown';

        // Compute duration
        let duration = '';
        if (meeting.startTime && meeting.endTime) {
            const [sh, sm] = meeting.startTime.split(':').map(Number);
            const [eh, em] = meeting.endTime.split(':').map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins > 0) duration = `${Math.floor(mins / 60)}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') + 'min' : ''}`;
        }

        const transcriptSection = transcript
            ? `Transcript:\n${transcript}`
            : `Note: No transcript was available for this meeting.`;

        const prompt = `You are a professional meeting secretary. Generate a complete and detailed meeting report in the same language as the transcript (French if transcript is in French, English otherwise).

Meeting: ${meeting.title}
Date: ${meeting.getDataValue('date')}
Time: ${meeting.startTime || 'N/A'} - ${meeting.endTime || 'N/A'}${duration ? ` (${duration})` : ''}
Location: ${meeting.location || 'N/A'}
Type: ${meeting.type}
Organizer: ${organizer}
Secretary: ${secretary}
Participants: ${participantNames || 'Unknown'}

${transcriptSection}

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):
{
  "summary": "2-3 sentence executive summary of the meeting",
  "whatWasSaid": "Detailed narrative of the main topics discussed, points raised, and the flow of the conversation. Write 3-6 paragraphs based on the transcript. If no transcript, write a brief note.",
  "decisions": ["Each formal decision taken during the meeting"],
  "actionItems": [{"task": "Task description", "assignee": "Person name or Unknown", "deadline": "deadline if mentioned or null"}]
}`;

        try {
            const ollamaController = new AbortController();
            const ollamaTimeout = setTimeout(() => ollamaController.abort(), 900_000); // 15 minutes

            const ollamaResponse = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    prompt,
                    stream: false,
                    think: false,
                    options: { temperature: 0.3, num_predict: 4000 },
                }),
                signal: ollamaController.signal,
            }).finally(() => clearTimeout(ollamaTimeout));

            if (ollamaResponse.ok) {
                const ollamaData = await ollamaResponse.json() as { response: string };
                const raw = ollamaData.response || '';
                console.log(`[Meetings] Ollama raw response (first 200): ${raw.slice(0, 200)}`);

                // Strip thinking tags, markdown fences, then extract JSON object
                const stripped = raw
                    .replace(/<think>[\s\S]*?<\/think>/gi, '')
                    .replace(/```(?:json)?/gi, '')
                    .replace(/```/g, '');
                const jsonMatch = stripped.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const report = JSON.parse(jsonMatch[0]);
                    await this.meetingModel.update({ report }, { where: { id } });
                    console.log(`[Meetings] Report saved for meeting ${id}`);
                } else {
                    console.error('[Meetings] Could not extract JSON from Ollama response:', raw);
                }
            } else {
                console.error(`[Meetings] Ollama returned ${ollamaResponse.status}`);
            }
        } catch (err) {
            console.error('[Meetings] Ollama report generation failed:', err);
        }

        return this.findOne(id);
    }
}

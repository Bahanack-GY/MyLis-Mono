import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { AttendanceUpload } from '../models/attendance-upload.model';
import { AttendanceRecord, AttendanceDay, AttendanceDayPair } from '../models/attendance-record.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';

interface ParsedAttendance {
    year: number;
    month: number;
    daysCount: number;
    rows: {
        employeeName: string;
        department: string | null;
        externalEmployeeId: string | null;
        cardNumber: string | null;
        days: AttendanceDay[];
        presentDays: number;
        absentDays: number;
    }[];
}

@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(AttendanceUpload) private uploadModel: typeof AttendanceUpload,
        @InjectModel(AttendanceRecord) private recordModel: typeof AttendanceRecord,
    ) {}

    /**
     * Parse the ZKTeco-style Attendance Record xls/xlsx export.
     * Layout:
     *   Row 0: Title
     *   Row 1: blank
     *   Row 2: meta + legend (SW/EW)
     *   Row 3: Employee ID | Card No. | Name | Department | <date1> | <date2> | ...
     *   Row 4: "" "" "" "" SW - EW (sub-header)
     *   Row 5+: data rows; each daily cell is multi-line "HH:MM HH:MM\nHH:MM HH:MM\n..."
     */
    parseWorkbook(filePath: string): ParsedAttendance {
        const buf = readFileSync(filePath);
        const wb = XLSX.read(buf, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new BadRequestException('Empty workbook');

        const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

        // Find the header row by locating "Name" and "Department" together.
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(grid.length, 10); i++) {
            const row = grid[i] ?? [];
            const text = row.map(c => String(c ?? '').toLowerCase());
            if (text.includes('name') && text.includes('department')) {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx < 0) {
            throw new BadRequestException('Could not locate header row (Name / Department)');
        }

        const headerRow = grid[headerRowIdx];
        const nameCol = headerRow.findIndex(c => String(c ?? '').toLowerCase() === 'name');
        const deptCol = headerRow.findIndex(c => String(c ?? '').toLowerCase() === 'department');
        const idCol = headerRow.findIndex(c => /employee\s*id/i.test(String(c ?? '')));
        const cardCol = headerRow.findIndex(c => /card\s*no/i.test(String(c ?? '')));
        const firstDateCol = Math.max(nameCol, deptCol, idCol, cardCol) + 1;

        // Parse date columns — each header should look like "2026/05/01" or be an Excel date.
        const dateCols: { col: number; day: number; year: number; month: number }[] = [];
        for (let c = firstDateCol; c < headerRow.length; c++) {
            const raw = headerRow[c];
            if (raw == null || raw === '') continue;
            const parsed = parseDateCell(raw);
            if (parsed) dateCols.push({ col: c, ...parsed });
        }
        if (dateCols.length === 0) {
            throw new BadRequestException('No date columns found in header');
        }

        // Determine the period (year/month) from the majority of dates.
        const keyCounts = new Map<string, number>();
        for (const d of dateCols) {
            const k = `${d.year}-${d.month}`;
            keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
        }
        const [bestKey] = [...keyCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        const [yearStr, monthStr] = bestKey.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        // Data rows start after the sub-header (row idx headerRowIdx + 2) if present,
        // otherwise immediately after headerRowIdx.
        const subHeader = grid[headerRowIdx + 1] ?? [];
        const looksLikeSubHeader = subHeader
            .map(c => String(c ?? '').toLowerCase())
            .some(c => c.includes('sw') && c.includes('ew'));
        const firstDataRow = headerRowIdx + (looksLikeSubHeader ? 2 : 1);

        const rows: ParsedAttendance['rows'] = [];
        for (let r = firstDataRow; r < grid.length; r++) {
            const row = grid[r] ?? [];
            const name = String(row[nameCol] ?? '').trim();
            if (!name) continue;

            const externalEmployeeId =
                idCol >= 0 && row[idCol] != null ? String(row[idCol]).replace(/\.0$/, '').trim() : null;
            const cardNumber =
                cardCol >= 0 && row[cardCol] != null ? String(row[cardCol]).trim() || null : null;
            const department =
                deptCol >= 0 && row[deptCol] != null ? String(row[deptCol]).trim() || null : null;

            const days: AttendanceDay[] = [];
            let presentDays = 0;
            for (const dc of dateCols) {
                const cell = row[dc.col];
                const pairs = parseDayCell(cell);
                days.push({ day: dc.day, pairs });
                if (pairs.some(p => p.sw || p.ew)) presentDays++;
            }

            rows.push({
                employeeName: name,
                department,
                externalEmployeeId,
                cardNumber,
                days,
                presentDays,
                absentDays: dateCols.length - presentDays,
            });
        }

        return { year, month, daysCount: dateCols.length, rows };
    }

    async ingestUpload(opts: {
        filePath: string;
        fileName: string;
        uploadedByUserId: string | null;
    }) {
        const parsed = this.parseWorkbook(opts.filePath);
        if (parsed.rows.length === 0) {
            throw new BadRequestException('No employee rows parsed from file');
        }

        // Replace any prior upload for the same (year, month).
        const existing = await this.uploadModel.findOne({
            where: { year: parsed.year, month: parsed.month },
        });
        if (existing) {
            await existing.destroy(); // cascades to records via FK
        }

        const upload = await this.uploadModel.create({
            year: parsed.year,
            month: parsed.month,
            fileName: opts.fileName,
            filePath: opts.filePath,
            uploadedByUserId: opts.uploadedByUserId,
            employeeCount: parsed.rows.length,
            daysCount: parsed.daysCount,
        });

        await this.recordModel.bulkCreate(
            parsed.rows.map(r => ({ ...r, uploadId: upload.id })),
        );

        return this.getByMonth(parsed.year, parsed.month);
    }

    async listMonths() {
        const uploads = await this.uploadModel.findAll({
            order: [['year', 'DESC'], ['month', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'uploadedBy',
                    attributes: ['id', 'email'],
                    include: [
                        { model: Employee, attributes: ['firstName', 'lastName'] },
                    ],
                },
            ],
        });
        return uploads.map(u => ({
            id: u.id,
            year: u.year,
            month: u.month,
            fileName: u.fileName,
            employeeCount: u.employeeCount,
            daysCount: u.daysCount,
            uploadedBy: u.uploadedBy
                ? {
                      id: u.uploadedBy.id,
                      email: u.uploadedBy.email,
                      firstName: (u.uploadedBy as any).Employee?.firstName ?? null,
                      lastName: (u.uploadedBy as any).Employee?.lastName ?? null,
                  }
                : null,
            createdAt: u.get('createdAt'),
        }));
    }

    async getByMonth(year: number, month: number) {
        const upload = await this.uploadModel.findOne({
            where: { year, month },
            include: [{ model: AttendanceRecord }],
        });
        if (!upload) throw new NotFoundException('No attendance data for that period');

        const records = (upload.records ?? []).slice().sort((a, b) =>
            a.employeeName.localeCompare(b.employeeName, 'fr', { sensitivity: 'base' }),
        );

        return {
            id: upload.id,
            year: upload.year,
            month: upload.month,
            fileName: upload.fileName,
            employeeCount: upload.employeeCount,
            daysCount: upload.daysCount,
            createdAt: upload.get('createdAt'),
            records: records.map(r => ({
                id: r.id,
                employeeName: r.employeeName,
                department: r.department,
                externalEmployeeId: r.externalEmployeeId,
                cardNumber: r.cardNumber,
                days: r.days,
                presentDays: r.presentDays,
                absentDays: r.absentDays,
            })),
        };
    }

    async deleteMonth(year: number, month: number) {
        const deleted = await this.uploadModel.destroy({ where: { year, month } });
        if (!deleted) throw new NotFoundException('No attendance data for that period');
        return { ok: true };
    }
}

/* ─── helpers ───────────────────────────────────────────────────────────── */

function parseDateCell(raw: any): { day: number; year: number; month: number } | null {
    if (raw == null) return null;
    // Excel serial numeric date (rare here, but supported)
    if (typeof raw === 'number') {
        // SheetJS gives Date object when cellDates is on; otherwise serial number.
        const epoch = new Date(Math.round((raw - 25569) * 86400 * 1000));
        if (isNaN(epoch.getTime())) return null;
        return { year: epoch.getUTCFullYear(), month: epoch.getUTCMonth() + 1, day: epoch.getUTCDate() };
    }
    if (raw instanceof Date) {
        return { year: raw.getFullYear(), month: raw.getMonth() + 1, day: raw.getDate() };
    }
    const s = String(raw).trim();
    // Match yyyy/mm/dd, yyyy-mm-dd, dd/mm/yyyy
    let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) return { year: +m[1], month: +m[2], day: +m[3] };
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return { year: +m[3], month: +m[2], day: +m[1] };
    return null;
}

function parseDayCell(raw: any): AttendanceDayPair[] {
    if (raw == null) return [];
    const text = String(raw);
    const pairs: AttendanceDayPair[] = [];
    // Each line: "HH:MM HH:MM" (or "--:-- --:--" for empty). Lines split on \n.
    for (const lineRaw of text.split(/\r?\n/)) {
        const line = lineRaw.trim();
        if (!line) continue;
        // Up to two HH:MM tokens (or --:--)
        const tokens = line.match(/(\d{1,2}:\d{2})|(-{2}:-{2})/g) ?? [];
        if (tokens.length === 0) continue;
        const sw = normaliseTime(tokens[0]);
        const ew = tokens.length >= 2 ? normaliseTime(tokens[1]) : null;
        if (sw || ew) pairs.push({ sw, ew });
    }
    return pairs;
}

function normaliseTime(tok: string | undefined): string | null {
    if (!tok) return null;
    if (tok.startsWith('--')) return null;
    return tok;
}

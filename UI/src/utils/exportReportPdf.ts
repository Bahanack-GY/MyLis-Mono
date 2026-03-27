import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
    Report, ReportTaskEntry, ReportSummary, EmployeeReportEntry,
    SectionSummary, ProjectSummary, LeadsSummary, GoalEntry,
} from '../api/reports/types';
import i18n from '../i18n/config';

/* ── Colors ─────────────────────────────────────────────── */
const DARK: [number, number, number] = [40, 56, 82];
const DARK_LIGHT: [number, number, number] = [62, 84, 118];
const TEAL: [number, number, number] = [51, 203, 204];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [220, 226, 234];
const TEXT_MUTED: [number, number, number] = [120, 130, 145];
const TEXT_BODY: [number, number, number] = [45, 55, 72];
const GREEN: [number, number, number] = [34, 139, 87];
const RED: [number, number, number] = [220, 60, 60];
const AMBER: [number, number, number] = [200, 140, 10];

const MARGIN = 16;
const TEXT_WIDTH_RATIO = 0.92; // used for justified text width

/* ── Language helpers ────────────────────────────────────── */

const STATE_LABELS: Record<string, Record<string, string>> = {
    fr: { CREATED: 'Cree', ASSIGNED: 'Assigne', IN_PROGRESS: 'En cours', BLOCKED: 'Bloque', COMPLETED: 'Termine', REVIEWED: 'Revu' },
    en: { CREATED: 'Created', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked', COMPLETED: 'Completed', REVIEWED: 'Reviewed' },
};
const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
    fr: { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' },
    en: { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' },
};
const MONTH_NAMES: Record<string, string[]> = {
    fr: ['Janv', 'Fevr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function getLang(report: Report): 'fr' | 'en' {
    return (report.reportData?.language === 'en' || i18n.language === 'en') ? 'en' : 'fr';
}

function t(key: string): string {
    return i18n.t(key);
}

function stateLabel(state: string, lang: 'fr' | 'en'): string {
    return STATE_LABELS[lang][state] || state;
}

function diffLabel(d: string, lang: 'fr' | 'en'): string {
    return DIFFICULTY_LABELS[lang][d] || d;
}

function fmtDate(dateStr: string | undefined, lang: 'fr' | 'en'): string {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
    } catch { return dateStr; }
}

function fmtDateShort(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    return dateStr;
}

function fmtAmount(amount: number, lang: 'fr' | 'en'): string {
    return amount.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') + ' FCFA';
}

function delta(current: number, previous: number): string {
    const d = current - previous;
    return (d >= 0 ? '+' : '') + d;
}

/* ── Logo loader ─────────────────────────────────────────── */

let _cachedLogo: string | null = null;

export function loadReportLogoBase64(src: string): Promise<string> {
    if (_cachedLogo) return Promise.resolve(_cachedLogo);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            _cachedLogo = canvas.toDataURL('image/png');
            resolve(_cachedLogo);
        };
        img.onerror = reject;
        img.src = src;
    });
}

/* ── Page header ─────────────────────────────────────────── */

function drawHeader(doc: jsPDF, logoBase64: string | undefined, report: Report, lang: 'fr' | 'en'): number {
    const pw = doc.internal.pageSize.getWidth();
    const rightEdge = pw - MARGIN;
    let y = 14;

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', MARGIN, y - 2, 16, 16);
    }
    const companyX = logoBase64 ? MARGIN + 20 : MARGIN;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text("LIFE'S SIMPLE SARL", companyX, y + 4);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Yaounde-Cameroun  |  contact@lis.cm  |  www.lis.cm', companyX, y + 9);

    const periodKey = {
        DAY: t('reports.period.day'),
        WEEK: t('reports.period.week'),
        MONTH: t('reports.period.month'),
        CUSTOM: t('reports.period.custom'),
    }[report.period] || report.period;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(t('reports.pdf.title'), rightEdge, y + 4, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(periodKey, rightEdge, y + 11, { align: 'right' });

    y += 20;
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.7);
    doc.line(MARGIN, y, rightEdge, y);
    doc.setLineWidth(0.2);

    return y + 8;
}

/* ── Footer ──────────────────────────────────────────────── */

function addFooters(doc: jsPDF, reportId: string): void {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const total = doc.getNumberOfPages();

    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        const footerY = ph - 10;
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, footerY - 3, pw - MARGIN, footerY - 3);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(
            `${t('reports.pdf.footer')} — ${t('reports.pdf.ref')} ${reportId.substring(0, 8).toUpperCase()}`,
            pw / 2, footerY, { align: 'center' },
        );
        doc.text(`${p} / ${total}`, pw - MARGIN, footerY, { align: 'right' });
    }
}

/* ── Meta info box ───────────────────────────────────────── */

function drawMeta(doc: jsPDF, report: Report, lang: 'fr' | 'en', y: number): number {
    const pw = doc.internal.pageSize.getWidth();
    const data = report.reportData!;
    const col2 = pw / 2 + 4;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(MARGIN, y, pw - MARGIN * 2, 26, 2, 2, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, pw - MARGIN * 2, 26, 2, 2, 'S');

    const col1 = MARGIN + 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_LIGHT);

    if (data.employee) {
        doc.text(t('reports.pdf.employee').toUpperCase(), col1, y + 6);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(`${data.employee.firstName} ${data.employee.lastName}`, col1, y + 13);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`${data.employee.department}  |  ${data.employee.position}`, col1, y + 20);
    } else if (data.department) {
        doc.text(t('reports.pdf.department').toUpperCase(), col1, y + 6);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(data.department.name, col1, y + 13);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`${data.employees?.length || 0} ${t('reports.pdf.employees')}`, col1, y + 20);
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_LIGHT);
    doc.text(t('reports.pdf.period').toUpperCase(), col2, y + 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(`${fmtDate(data.period.startDate, lang)} — ${fmtDate(data.period.endDate, lang)}`, col2, y + 13);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${t('reports.pdf.generatedOn')} ${fmtDate(report.createdAt, lang)}`, col2, y + 20);

    return y + 34;
}

/* ── Section heading ─────────────────────────────────────── */

function drawSectionHeading(doc: jsPDF, title: string, y: number, pw: number): number {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(title, MARGIN, y);
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(1.2);
    doc.line(MARGIN, y + 2, MARGIN + 30, y + 2);
    doc.setLineWidth(0.2);
    return y + 10;
}

/* ── AI narrative pages ──────────────────────────────────── */

/**
 * Detect if a line is a section heading (all uppercase, no punctuation like . or ,)
 */
function isHeadingLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 4 || trimmed.length > 60) return false;
    // All uppercase (letters, spaces, apostrophes, hyphens)
    return trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !/[.,;:!?]/.test(trimmed);
}

/**
 * Parse AI content into structured blocks: heading or body paragraph
 */
function parseAiContent(content: string): Array<{ type: 'heading' | 'body'; text: string }> {
    const blocks: Array<{ type: 'heading' | 'body'; text: string }> = [];
    const rawParagraphs = content.split(/\n\n+/);

    for (const para of rawParagraphs) {
        const lines = para.split('\n').filter(l => l.trim());
        if (lines.length === 0) continue;

        // Check if first line is a heading
        if (lines.length >= 1 && isHeadingLine(lines[0])) {
            // Push heading
            blocks.push({ type: 'heading', text: lines[0].trim() });
            // Push remaining lines as body (if any)
            if (lines.length > 1) {
                const bodyText = lines.slice(1).join(' ').trim();
                if (bodyText) blocks.push({ type: 'body', text: bodyText });
            }
        } else {
            // The whole paragraph is body
            blocks.push({ type: 'body', text: lines.join(' ').trim() });
        }
    }

    return blocks;
}

function drawAiNarrative(
    doc: jsPDF,
    aiContent: string,
    logoBase64: string | undefined,
    report: Report,
    lang: 'fr' | 'en',
): void {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const textWidth = pw - MARGIN * 2;
    const BOTTOM_MARGIN = 22;

    let y = drawHeader(doc, logoBase64, report, lang);
    y = drawMeta(doc, report, lang, y);

    // Main section title
    const aiTitle = lang === 'fr' ? 'RAPPORT D\'ACTIVITE' : 'ACTIVITY REPORT';
    y = drawSectionHeading(doc, aiTitle, y, pw);

    // Parse and render AI blocks
    const blocks = parseAiContent(aiContent);

    for (const block of blocks) {
        if (block.type === 'heading') {
            // Sub-heading: bold, 11pt, with spacing before
            const headingHeight = 14;
            if (y + headingHeight > ph - BOTTOM_MARGIN) {
                doc.addPage();
                y = drawHeader(doc, logoBase64, report, lang);
                y += 4;
            }
            y += 3; // extra space before heading
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            doc.text(block.text, MARGIN, y);
            // Light underline
            doc.setDrawColor(...BORDER);
            doc.setLineWidth(0.3);
            doc.line(MARGIN, y + 1.5, pw - MARGIN, y + 1.5);
            doc.setLineWidth(0.2);
            y += 8;
        } else {
            // Body paragraph: 10.5pt, justified
            const lines = doc.splitTextToSize(block.text, textWidth);
            const lineH = 5.5;
            const blockHeight = lines.length * lineH;

            if (y + blockHeight > ph - BOTTOM_MARGIN) {
                doc.addPage();
                y = drawHeader(doc, logoBase64, report, lang);
                y += 4;
            }

            doc.setFontSize(10.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_BODY);
            // Render line by line for justified alignment
            for (let li = 0; li < lines.length; li++) {
                const isLastLine = li === lines.length - 1;
                doc.text(lines[li], MARGIN, y, {
                    align: isLastLine ? 'left' : 'justify',
                    maxWidth: textWidth,
                });
                y += lineH;
            }
            y += 4; // paragraph spacing
        }
    }
}

/* ── Evolution comparison section ────────────────────────── */

function drawEvolutionSection(
    doc: jsPDF,
    data: any,
    lang: 'fr' | 'en',
    y: number,
    pw: number,
    ph: number,
    BOTTOM: number,
    logoBase64: string | undefined,
    report: Report,
): number {
    if (!data.previousPeriodSummary || !data.previousPeriod) return y;

    const curr = data.summary;
    const prev = data.previousPeriodSummary;
    const pp = data.previousPeriod;

    const headingLabel = lang === 'fr' ? 'EVOLUTION' : 'EVOLUTION';
    y = drawSectionHeading(doc, headingLabel, y, pw);

    // Period labels row
    const colW = (pw - MARGIN * 2) / 3;
    const col1 = MARGIN;
    const col2 = MARGIN + colW;
    const col3 = MARGIN + colW * 2;

    // Header row
    doc.setFillColor(...DARK);
    doc.roundedRect(col1, y, colW * 3, 9, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(lang === 'fr' ? 'INDICATEUR' : 'INDICATOR', col1 + 3, y + 6);
    doc.text(lang === 'fr' ? `PERIODE PRECEDENTE (${pp.startDate})` : `PREVIOUS PERIOD (${pp.startDate})`, col2 + colW / 2, y + 6, { align: 'center' });
    doc.text(lang === 'fr' ? 'PERIODE ACTUELLE' : 'CURRENT PERIOD', col3 + colW / 2, y + 6, { align: 'center' });
    y += 9;

    const rows: { label: string; prev: string; curr: string; up: boolean | null }[] = [
        {
            label: lang === 'fr' ? 'Total taches' : 'Total tasks',
            prev: String(prev.total),
            curr: String(curr.total),
            up: curr.total >= prev.total,
        },
        {
            label: lang === 'fr' ? 'Taches terminees' : 'Completed tasks',
            prev: `${prev.completed + prev.reviewed} (${prev.completionRate}%)`,
            curr: `${curr.completed + curr.reviewed} (${curr.completionRate}%)`,
            up: curr.completionRate >= prev.completionRate,
        },
        {
            label: lang === 'fr' ? 'En cours' : 'In progress',
            prev: String(prev.inProgress),
            curr: String(curr.inProgress),
            up: null,
        },
        {
            label: lang === 'fr' ? 'Bloquees' : 'Blocked',
            prev: String(prev.blocked),
            curr: String(curr.blocked),
            up: curr.blocked <= prev.blocked,
        },
        {
            label: lang === 'fr' ? 'Taux de completion' : 'Completion rate',
            prev: `${prev.completionRate}%`,
            curr: `${curr.completionRate}%`,
            up: curr.completionRate >= prev.completionRate,
        },
    ];

    rows.forEach((row, i) => {
        const rowY = y;
        const isEven = i % 2 === 0;

        if (isEven) {
            doc.setFillColor(...LIGHT_BG);
            doc.rect(col1, rowY, colW * 3, 8, 'F');
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_BODY);
        doc.text(row.label, col1 + 3, rowY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(row.prev, col2 + colW / 2, rowY + 5.5, { align: 'center' });

        // Current value with color based on trend
        const color: [number, number, number] = row.up === null ? DARK_LIGHT : row.up ? GREEN : RED;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(row.curr, col3 + colW / 2, rowY + 5.5, { align: 'center' });

        y += 8;
    });

    // Light border around entire table
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(col1, y - rows.length * 8, colW * 3, rows.length * 8, 'S');

    return y + 8;
}

/* ── Summary stat boxes ──────────────────────────────────── */

function drawSummaryBoxes(doc: jsPDF, summary: ReportSummary, y: number, pw: number): number {
    const stats = [
        { label: t('reports.pdf.totalTasks'), value: summary.total, color: DARK },
        { label: t('reports.pdf.completed'), value: summary.completed + summary.reviewed, color: GREEN },
        { label: t('reports.pdf.inProgress'), value: summary.inProgress, color: AMBER },
        { label: t('reports.pdf.blocked'), value: summary.blocked, color: RED },
        { label: t('reports.pdf.completionRate'), value: `${summary.completionRate}%`, color: DARK_LIGHT },
    ];

    const boxW = (pw - MARGIN * 2 - (stats.length - 1) * 3) / stats.length;
    const boxH = 20;

    stats.forEach((stat, i) => {
        const x = MARGIN + i * (boxW + 3);
        doc.setFillColor(...LIGHT_BG);
        doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F');
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, boxW, boxH, 2, 2, 'S');
        // Colored top bar
        doc.setFillColor(...stat.color);
        doc.roundedRect(x, y, boxW, 2, 1, 1, 'F');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(stat.label.toUpperCase(), x + boxW / 2, y + 8, { align: 'center', maxWidth: boxW - 4 });
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...stat.color);
        doc.text(String(stat.value), x + boxW / 2, y + 16.5, { align: 'center' });
    });

    return y + boxH + 8;
}

/* ── Extra stats (demands, tickets, expenses, invoices) ───── */

function drawExtraStats(doc: jsPDF, data: any, lang: 'fr' | 'en', y: number, pw: number): number {
    const sections: { label: string; items: { k: string; v: string | number }[] }[] = [];

    if (data.demandsSummary) {
        const d = data.demandsSummary;
        sections.push({
            label: lang === 'fr' ? 'DEMANDES D\'ACHAT' : 'PURCHASE DEMANDS',
            items: [
                { k: 'Total', v: d.total },
                { k: lang === 'fr' ? 'En attente' : 'Pending', v: d.pending ?? 0 },
                { k: lang === 'fr' ? 'Validees' : 'Validated', v: d.validated ?? 0 },
                { k: lang === 'fr' ? 'Rejetees' : 'Rejected', v: d.rejected ?? 0 },
                { k: lang === 'fr' ? 'Montant' : 'Amount', v: fmtAmount(d.totalAmount || 0, lang) },
            ],
        });
    }

    if (data.ticketsSummary) {
        const tk = data.ticketsSummary;
        sections.push({
            label: lang === 'fr' ? 'TICKETS SUPPORT' : 'SUPPORT TICKETS',
            items: [
                { k: 'Total', v: tk.total },
                { k: lang === 'fr' ? 'Ouverts' : 'Open', v: tk.open ?? 0 },
                { k: lang === 'fr' ? 'En cours' : 'In Progress', v: tk.inProgress ?? 0 },
                { k: lang === 'fr' ? 'Resolus' : 'Resolved', v: tk.closed ?? 0 },
            ],
        });
    }

    if (data.businessExpensesSummary) {
        const be = data.businessExpensesSummary;
        sections.push({
            label: lang === 'fr' ? 'FRAIS DE VIE' : 'BUSINESS EXPENSES',
            items: [
                { k: 'Total', v: be.total },
                { k: lang === 'fr' ? 'En attente' : 'Pending', v: be.pending ?? 0 },
                { k: lang === 'fr' ? 'Valides' : 'Validated', v: be.validated ?? 0 },
                { k: lang === 'fr' ? 'Montant' : 'Amount', v: fmtAmount(be.totalAmount || 0, lang) },
            ],
        });
    }

    if (data.invoicesSummary) {
        const inv = data.invoicesSummary;
        sections.push({
            label: lang === 'fr' ? 'FACTURATION' : 'INVOICING',
            items: [
                { k: 'Total', v: inv.total },
                { k: lang === 'fr' ? 'Payees' : 'Paid', v: inv.paid ?? 0 },
                { k: lang === 'fr' ? 'Envoyees' : 'Sent', v: inv.sent ?? 0 },
                { k: lang === 'fr' ? 'En attente' : 'Pending', v: inv.pending ?? 0 },
            ],
        });
    }

    if (sections.length === 0) return y;

    const sectionW = (pw - MARGIN * 2 - (sections.length - 1) * 5) / sections.length;

    sections.forEach((section, si) => {
        const sx = MARGIN + si * (sectionW + 5);

        // Section card
        const cardH = 8 + section.items.length * 9 + 3;
        doc.setFillColor(250, 251, 253);
        doc.roundedRect(sx, y, sectionW, cardH, 2, 2, 'F');
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(sx, y, sectionW, cardH, 2, 2, 'S');
        // Colored top
        doc.setFillColor(...DARK);
        doc.roundedRect(sx, y, sectionW, 7, 2, 2, 'F');
        doc.rect(sx, y + 3, sectionW, 4, 'F'); // square bottom corners of header

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(section.label, sx + sectionW / 2, y + 4.8, { align: 'center', maxWidth: sectionW - 4 });

        let iy = y + 10;
        section.items.forEach(item => {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_MUTED);
            doc.text(String(item.k), sx + 4, iy);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            doc.text(String(item.v), sx + sectionW - 4, iy, { align: 'right' });
            iy += 9;
        });
    });

    const maxItems = Math.max(...sections.map(s => s.items.length));
    return y + 8 + maxItems * 9 + 8;
}

/* ── Projects section ────────────────────────────────────── */

function drawProjectsSection(doc: jsPDF, projects: ProjectSummary[], lang: 'fr' | 'en', y: number, pw: number): number {
    if (!projects || projects.length === 0) return y;

    const heading = lang === 'fr' ? 'PROJETS EN COURS' : 'ACTIVE PROJECTS';
    y = drawSectionHeading(doc, heading, y, pw);

    autoTable(doc, {
        startY: y,
        head: [[
            lang === 'fr' ? 'Projet' : 'Project',
            lang === 'fr' ? 'Taches totales' : 'Total tasks',
            lang === 'fr' ? 'Terminees' : 'Completed',
            lang === 'fr' ? 'Avancement' : 'Progress',
            lang === 'fr' ? 'Echeance' : 'Deadline',
        ]],
        body: projects.map(p => [
            p.name,
            p.totalTasks,
            p.completedTasks,
            `${p.completionRate}%`,
            fmtDateShort(p.endDate),
        ]),
        theme: 'striped',
        headStyles: { fillColor: DARK, textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { fontSize: 8, textColor: TEXT_BODY, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [244, 246, 250] },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 26, halign: 'center' },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
        },
        margin: { left: MARGIN, right: MARGIN },
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 3) {
                const rate = projects[hookData.row.index]?.completionRate || 0;
                hookData.cell.styles.textColor = rate >= 80 ? GREEN : rate >= 50 ? AMBER : RED;
                hookData.cell.styles.fontStyle = 'bold';
            }
        },
    });

    return (doc as any).lastAutoTable.finalY + 8;
}

/* ── Leads & Goals section ───────────────────────────────── */

function drawLeadsSection(doc: jsPDF, leads: LeadsSummary, goals: GoalEntry[], lang: 'fr' | 'en', y: number, pw: number): number {
    const heading = lang === 'fr' ? 'PIPELINE COMMERCIAL' : 'COMMERCIAL PIPELINE';
    y = drawSectionHeading(doc, heading, y, pw);

    const totalGoal = goals.reduce((s, g) => s + g.targetAmount, 0);

    const leadsItems = [
        { k: lang === 'fr' ? 'Nouveaux leads (periode)' : 'New leads (period)', v: leads.newThisPeriod },
        { k: lang === 'fr' ? 'Leads gagnes' : 'Won leads', v: leads.won },
        { k: lang === 'fr' ? 'Leads perdus' : 'Lost leads', v: leads.lost },
        { k: lang === 'fr' ? 'Leads actifs en pipeline' : 'Active leads in pipeline', v: leads.totalActive },
        { k: lang === 'fr' ? 'CA potentiel (pipeline)' : 'Potential revenue (pipeline)', v: fmtAmount(leads.potentialRevenue, lang) },
        { k: lang === 'fr' ? 'CA gagne cette periode' : 'Revenue won this period', v: fmtAmount(leads.wonRevenuePeriod, lang) },
        ...(totalGoal > 0 ? [{ k: lang === 'fr' ? 'Objectif commercial' : 'Commercial target', v: fmtAmount(totalGoal, lang) }] : []),
    ];

    const cardW = pw - MARGIN * 2;
    const cardH = 10 + leadsItems.length * 9;

    doc.setFillColor(250, 251, 253);
    doc.roundedRect(MARGIN, y, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, cardW, cardH, 2, 2, 'S');

    let iy = y + 8;
    leadsItems.forEach((item, idx) => {
        if (idx % 2 === 0) {
            doc.setFillColor(244, 246, 250);
            doc.rect(MARGIN, iy - 2, cardW, 9, 'F');
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(String(item.k), MARGIN + 6, iy + 4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(String(item.v), pw - MARGIN - 6, iy + 4, { align: 'right' });
        iy += 9;
    });

    return y + cardH + 8;
}

/* ── Tasks table ─────────────────────────────────────────── */

function drawTasksTable(doc: jsPDF, tasks: ReportTaskEntry[], lang: 'fr' | 'en', startY: number, pw: number): number {
    if (tasks.length === 0) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(t('reports.pdf.noTasks'), MARGIN, startY + 5);
        return startY + 12;
    }

    const stateColors: Record<string, [number, number, number]> = {
        COMPLETED: GREEN, REVIEWED: [59, 130, 246], IN_PROGRESS: AMBER,
        BLOCKED: RED, CREATED: [107, 114, 128], ASSIGNED: [168, 85, 247],
    };

    const rows = tasks.map(task => [
        task.title.length > 38 ? task.title.substring(0, 35) + '...' : task.title,
        stateLabel(task.state, lang),
        diffLabel(task.difficulty || '', lang),
        fmtDateShort(task.dueDate),
        task.nature || '-',
        task.project || '-',
    ]);

    autoTable(doc, {
        startY,
        head: [[
            t('reports.pdf.taskTitle'),
            t('reports.pdf.status'),
            t('reports.pdf.difficulty'),
            t('reports.pdf.dueDate'),
            t('reports.pdf.nature'),
            t('reports.pdf.project'),
        ]],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: DARK, textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { fontSize: 8, textColor: TEXT_BODY, cellPadding: 3 },
        alternateRowStyles: { fillColor: [244, 246, 250] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 24, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 24, halign: 'center' },
        },
        margin: { left: MARGIN, right: MARGIN },
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 1) {
                const task = tasks[hookData.row.index];
                if (task) {
                    hookData.cell.styles.textColor = stateColors[task.state] || TEXT_MUTED;
                    hookData.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    return (doc as any).lastAutoTable.finalY + 6;
}

/* ── Stats data page(s) ──────────────────────────────────── */

function drawStatsPages(
    doc: jsPDF,
    report: Report,
    logoBase64: string | undefined,
    lang: 'fr' | 'en',
): void {
    const data = report.reportData!;
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const BOTTOM = 22;

    doc.addPage();
    let y = drawHeader(doc, logoBase64, report, lang);

    // ── Section title
    const statsTitle = lang === 'fr' ? 'DONNEES STATISTIQUES' : 'STATISTICAL DATA';
    y = drawSectionHeading(doc, statsTitle, y, pw);

    // ── Summary KPI boxes
    y = drawSummaryBoxes(doc, data.summary, y, pw);

    // ── Evolution comparison (current vs previous period)
    if (data.previousPeriodSummary) {
        if (y + 80 > ph - BOTTOM) {
            doc.addPage();
            y = drawHeader(doc, logoBase64, report, lang);
            y += 4;
        }
        y = drawEvolutionSection(doc, data, lang, y, pw, ph, BOTTOM, logoBase64, report);
    }

    // ── Extra stats: demands, tickets, expenses, invoices
    if (data.demandsSummary || data.ticketsSummary || data.businessExpensesSummary || data.invoicesSummary) {
        if (y + 80 > ph - BOTTOM) {
            doc.addPage();
            y = drawHeader(doc, logoBase64, report, lang);
            y += 4;
        }
        const kpiTitle = lang === 'fr' ? 'INDICATEURS OPERATIONNELS' : 'OPERATIONAL INDICATORS';
        y = drawSectionHeading(doc, kpiTitle, y, pw);
        y = drawExtraStats(doc, data, lang, y, pw);
    }

    // ── Projects section
    if (data.projects && data.projects.length > 0) {
        if (y + 60 > ph - BOTTOM) {
            doc.addPage();
            y = drawHeader(doc, logoBase64, report, lang);
            y += 4;
        }
        y = drawProjectsSection(doc, data.projects, lang, y, pw);
    }

    // ── Leads & commercial goals (for relevant roles)
    if (data.leadsSummary) {
        if (y + 100 > ph - BOTTOM) {
            doc.addPage();
            y = drawHeader(doc, logoBase64, report, lang);
            y += 4;
        }
        y = drawLeadsSection(doc, data.leadsSummary, data.goalsSummary || [], lang, y, pw);
    }

    // ── Task list(s)
    const taskHeading = lang === 'fr' ? 'DETAIL DES TACHES' : 'TASK DETAILS';

    if (report.type === 'PERSONAL' && data.tasks && data.tasks.length > 0) {
        if (y + 40 > ph - BOTTOM) {
            doc.addPage();
            y = drawHeader(doc, logoBase64, report, lang);
            y += 4;
        }
        y = drawSectionHeading(doc, taskHeading, y, pw);
        y = drawTasksTable(doc, data.tasks, lang, y, pw);
    }

    if (report.type === 'DEPARTMENT' && data.employees) {
        if (y + 30 > ph - BOTTOM) {
            doc.addPage();
            y = drawHeader(doc, logoBase64, report, lang);
            y += 4;
        }
        y = drawSectionHeading(doc, taskHeading, y, pw);

        for (const empReport of data.employees) {
            if (y + 50 > ph - BOTTOM) {
                doc.addPage();
                y = drawHeader(doc, logoBase64, report, lang);
                y += 4;
            }

            // Employee header bar
            doc.setFillColor(...DARK);
            doc.roundedRect(MARGIN, y, pw - MARGIN * 2, 11, 1.5, 1.5, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(
                `${empReport.employee.firstName} ${empReport.employee.lastName}${empReport.employee.position ? '  —  ' + empReport.employee.position : ''}`,
                MARGIN + 5, y + 7.5,
            );

            // Mini stats + delta vs previous period
            let miniStats = `${empReport.summary.completed + empReport.summary.reviewed}/${empReport.summary.total}  |  ${empReport.summary.completionRate}%`;
            if (empReport.previousPeriodSummary) {
                const d = empReport.summary.completionRate - empReport.previousPeriodSummary.completionRate;
                miniStats += `  (${d >= 0 ? '+' : ''}${d}pp)`;
            }
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(miniStats, pw - MARGIN - 4, y + 7.5, { align: 'right' });
            y += 15;

            y = drawTasksTable(doc, empReport.tasks, lang, y, pw);
            y += 4;
        }
    }
}

/* ── Main export function ────────────────────────────────── */

export function exportReportPdf(report: Report, logoBase64?: string): void {
    if (!report.reportData) return;

    const lang = getLang(report);
    const data = report.reportData;

    const doc = new jsPDF();

    if (data.aiContent) {
        drawAiNarrative(doc, data.aiContent, logoBase64, report, lang);
    } else {
        drawHeader(doc, logoBase64, report, lang);
    }

    drawStatsPages(doc, report, logoBase64, lang);
    addFooters(doc, report.id);

    const typeLabel = report.type === 'PERSONAL'
        ? (report.targetEmployee ? `${report.targetEmployee.firstName}_${report.targetEmployee.lastName}` : 'Personnel')
        : (report.targetDepartment ? report.targetDepartment.name : 'Departement');

    const filename = `Rapport_${typeLabel}_${report.startDate}_${report.endDate}.pdf`.replace(/\s+/g, '_');
    doc.save(filename);
}

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Colors (same palette as exportReportPdf) ──────────────── */
const DARK: [number, number, number] = [40, 56, 82];
const DARK_LIGHT: [number, number, number] = [62, 84, 118];
const TEAL: [number, number, number] = [51, 203, 204];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [220, 226, 234];
const TEXT_MUTED: [number, number, number] = [120, 130, 145];
const TEXT_BODY: [number, number, number] = [45, 55, 72];
const GREEN: [number, number, number] = [34, 139, 87];
const AMBER: [number, number, number] = [200, 140, 10];

const MARGIN = 16;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/* ── Types ─────────────────────────────────────────────────── */
export interface MeetingReportData {
    id: string;
    title: string;
    type: string;
    status: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    organizer: { name: string };
    secretary: { name: string } | null;
    participants: { name: string; attended: boolean }[];
    transcript: string | null;
    report: {
        summary: string;
        whatWasSaid?: string;
        decisions: string[];
        actionItems: { task: string; assignee: string; deadline?: string | null }[];
    } | null;
}

/* ── Helpers ───────────────────────────────────────────────── */
function fmtDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
}

function computeDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return '—';
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
    return doc.splitTextToSize(text, maxWidth);
}

let _cachedLogo: string | null = null;

export function loadMeetingReportLogo(src: string): Promise<string> {
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

/* ── Header ────────────────────────────────────────────────── */
function drawHeader(doc: jsPDF, logoBase64: string | undefined): number {
    const rightEdge = PAGE_WIDTH - MARGIN;
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

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('COMPTE RENDU DE RÉUNION', rightEdge, y + 4, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Meeting Report', rightEdge, y + 11, { align: 'right' });

    y += 20;
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.7);
    doc.line(MARGIN, y, rightEdge, y);
    doc.setLineWidth(0.2);

    return y + 8;
}

/* ── Footer ────────────────────────────────────────────────── */
function addFooters(doc: jsPDF, meetingId: string): void {
    const ph = doc.internal.pageSize.getHeight();
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        const footerY = ph - 10;
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, footerY - 3, PAGE_WIDTH - MARGIN, footerY - 3);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(
            `Document généré automatiquement — Réf. ${meetingId.substring(0, 8).toUpperCase()}`,
            PAGE_WIDTH / 2, footerY, { align: 'center' },
        );
        doc.text(`${p} / ${total}`, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });
    }
}

/* ── Section label ─────────────────────────────────────────── */
function drawSectionTitle(doc: jsPDF, label: string, y: number): number {
    doc.setFillColor(...TEAL);
    doc.rect(MARGIN, y, 3, 5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label.toUpperCase(), MARGIN + 6, y + 4);
    return y + 9;
}

/* ── Page overflow guard ───────────────────────────────────── */
function checkPageBreak(doc: jsPDF, y: number, needed = 10): number {
    const ph = doc.internal.pageSize.getHeight();
    if (y + needed > ph - 18) {
        doc.addPage();
        return 20;
    }
    return y;
}

/* ── Main export ───────────────────────────────────────────── */
export function exportMeetingReportPdf(meeting: MeetingReportData, logoBase64?: string): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let y = drawHeader(doc, logoBase64);

    /* ── Meeting meta box ──────────────────────────────────── */
    const duration = computeDuration(meeting.startTime, meeting.endTime);

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 38, 2, 2, 'F');
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 38, 2, 2, 'S');

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const titleLines = splitLines(doc, meeting.title, CONTENT_WIDTH - 10);
    doc.text(titleLines, MARGIN + 5, y + 8);
    const titleHeight = titleLines.length * 6;

    // Meta row 1: date, time, duration
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MUTED);
    const metaY = y + 8 + titleHeight + 2;
    doc.text(`Date :   ${fmtDate(meeting.date)}`, MARGIN + 5, metaY);
    doc.text(`Heure :  ${meeting.startTime || '—'} – ${meeting.endTime || '—'}  (${duration})`, MARGIN + 5, metaY + 5);
    doc.text(`Lieu :   ${meeting.location || '—'}`, MARGIN + 5, metaY + 10);

    // Type badge
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEAL);
    doc.text(meeting.type.toUpperCase(), PAGE_WIDTH - MARGIN - 5, y + 8, { align: 'right' });

    y += 44;

    /* ── Organizer / Secretary / Participants ──────────────── */
    y = drawSectionTitle(doc, 'Intervenants', y);
    y = checkPageBreak(doc, y, 30);

    // Two-column: organizer + secretary
    const col2X = PAGE_WIDTH / 2 + 2;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(MARGIN, y, (CONTENT_WIDTH / 2) - 2, 20, 2, 2, 'F');
    doc.setDrawColor(...BORDER);
    doc.roundedRect(MARGIN, y, (CONTENT_WIDTH / 2) - 2, 20, 2, 2, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_LIGHT);
    doc.text('ORGANISATEUR', MARGIN + 4, y + 5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(meeting.organizer.name || '—', MARGIN + 4, y + 13);

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(col2X, y, (CONTENT_WIDTH / 2) - 2, 20, 2, 2, 'F');
    doc.setDrawColor(...BORDER);
    doc.roundedRect(col2X, y, (CONTENT_WIDTH / 2) - 2, 20, 2, 2, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_LIGHT);
    doc.text('SECRÉTAIRE', col2X + 4, y + 5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(meeting.secretary?.name || '—', col2X + 4, y + 13);

    y += 24;

    // Participants table
    y = checkPageBreak(doc, y, 20);
    const attendedCount = meeting.participants.filter(p => p.attended).length;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`PARTICIPANTS — ${meeting.participants.length} invités, ${attendedCount} présents`, MARGIN, y + 4);
    y += 8;

    if (meeting.participants.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['Nom', 'Présence']],
            body: meeting.participants.map(p => [
                p.name,
                p.attended ? '✓ Présent(e)' : '✗ Absent(e)',
            ]),
            styles: { fontSize: 8, cellPadding: 3, textColor: TEXT_BODY },
            headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 35, halign: 'center' },
            },
            alternateRowStyles: { fillColor: LIGHT_BG },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 1) {
                    const val = String(data.cell.raw);
                    data.cell.styles.textColor = val.startsWith('✓') ? GREEN : [180, 60, 60];
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    } else {
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_MUTED);
        doc.text('Aucun participant enregistré.', MARGIN + 4, y + 5);
        y += 12;
    }

    /* ── Summary ───────────────────────────────────────────── */
    if (meeting.report?.summary) {
        y = checkPageBreak(doc, y, 20);
        y = drawSectionTitle(doc, 'Résumé exécutif', y);

        doc.setFillColor(...LIGHT_BG);
        doc.setDrawColor(...BORDER);
        const summaryLines = splitLines(doc, meeting.report.summary, CONTENT_WIDTH - 10);
        const boxH = summaryLines.length * 5 + 10;
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 2, 2, 'F');
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 2, 2, 'S');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_BODY);
        doc.text(summaryLines, MARGIN + 5, y + 7);
        y += boxH + 6;
    }

    /* ── What was said ─────────────────────────────────────── */
    if (meeting.report?.whatWasSaid) {
        y = checkPageBreak(doc, y, 20);
        y = drawSectionTitle(doc, 'Déroulement de la réunion', y);

        const paragraphs = meeting.report.whatWasSaid.split(/\n+/).filter(p => p.trim());
        for (const para of paragraphs) {
            const lines = splitLines(doc, para.trim(), CONTENT_WIDTH - 8);
            const needed = lines.length * 5 + 4;
            y = checkPageBreak(doc, y, needed);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_BODY);
            doc.text(lines, MARGIN + 4, y + 4);
            y += needed;
        }
        y += 4;
    }

    /* ── Decisions ─────────────────────────────────────────── */
    if (meeting.report?.decisions?.length) {
        y = checkPageBreak(doc, y, 20);
        y = drawSectionTitle(doc, 'Décisions prises', y);

        for (let i = 0; i < meeting.report.decisions.length; i++) {
            const dec = meeting.report.decisions[i];
            const lines = splitLines(doc, dec, CONTENT_WIDTH - 16);
            const boxH = lines.length * 5 + 8;
            y = checkPageBreak(doc, y, boxH + 3);

            // Numbered badge
            doc.setFillColor(...TEAL);
            doc.circle(MARGIN + 4, y + boxH / 2, 3.5, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(String(i + 1), MARGIN + 4, y + boxH / 2 + 2.5, { align: 'center' });

            doc.setFillColor(245, 255, 255);
            doc.setDrawColor(...TEAL);
            doc.setLineWidth(0.3);
            doc.roundedRect(MARGIN + 10, y, CONTENT_WIDTH - 10, boxH, 2, 2, 'F');
            doc.roundedRect(MARGIN + 10, y, CONTENT_WIDTH - 10, boxH, 2, 2, 'S');

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_BODY);
            doc.text(lines, MARGIN + 14, y + 5);
            y += boxH + 4;
        }
        y += 2;
    }

    /* ── Action items ──────────────────────────────────────── */
    if (meeting.report?.actionItems?.length) {
        y = checkPageBreak(doc, y, 20);
        y = drawSectionTitle(doc, "Points d'action", y);

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['Tâche', 'Responsable', 'Échéance']],
            body: meeting.report.actionItems.map(ai => [
                ai.task,
                ai.assignee,
                ai.deadline || '—',
            ]),
            styles: { fontSize: 8, cellPadding: 3.5, textColor: TEXT_BODY },
            headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 40 },
                2: { cellWidth: 30, halign: 'center' },
            },
            alternateRowStyles: { fillColor: LIGHT_BG },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    /* ── Transcript (collapsed, small) ─────────────────────── */
    if (meeting.transcript) {
        y = checkPageBreak(doc, y, 20);
        y = drawSectionTitle(doc, 'Transcription brute', y);

        const transcriptLines = splitLines(doc, meeting.transcript, CONTENT_WIDTH - 10);
        // Limit to 80 lines in PDF to avoid huge PDFs
        const limited = transcriptLines.slice(0, 80);
        const boxH = limited.length * 4.2 + 10;
        y = checkPageBreak(doc, y, Math.min(boxH, 40));

        doc.setFillColor(...LIGHT_BG);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, Math.min(boxH, 200), 2, 2, 'F');
        doc.roundedRect(MARGIN, y, CONTENT_WIDTH, Math.min(boxH, 200), 2, 2, 'S');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_MUTED);
        doc.text(limited, MARGIN + 5, y + 6);
        if (transcriptLines.length > 80) {
            doc.setFontSize(6.5);
            doc.setTextColor(...AMBER);
            doc.text(`[… ${transcriptLines.length - 80} lignes supplémentaires non affichées]`, MARGIN + 5, y + boxH + 2);
        }
    }

    addFooters(doc, meeting.id);

    const fileName = `reunion_${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${meeting.date}.pdf`;
    doc.save(fileName);
}

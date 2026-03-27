import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Report, AccountingReportData } from '../api/reports/types';

/* ── Brand Colors ───────────────────────────────────────── */
const BRAND_DARK: [number, number, number] = [40, 56, 82];      // #283852
const BRAND_LIGHT: [number, number, number] = [51, 203, 204];   // #33cbcc
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_50: [number, number, number] = [249, 250, 251];
const GRAY_200: [number, number, number] = [229, 231, 235];
const GRAY_600: [number, number, number] = [75, 85, 99];
const GRAY_900: [number, number, number] = [17, 24, 39];

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4 width in mm

/* ── Helpers ────────────────────────────────────────────── */

function getLang(report: Report): 'fr' | 'en' {
    const data = report.reportData as AccountingReportData;
    return data?.language === 'en' ? 'en' : 'fr';
}

function formatXAF(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return '0 XAF';
    }
    // Format with space as thousand separator to avoid PDF rendering issues
    const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return formatted + ' XAF';
}

function formatDate(dateStr: string, lang: 'fr' | 'en'): string {
    try {
        return new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

async function loadLogoBase64(): Promise<string | undefined> {
    try {
        console.log('Loading logo from /logo-lis.png...');
        const response = await fetch('/logo-lis.png');

        if (!response.ok) {
            console.error('Failed to fetch logo:', response.status, response.statusText);
            return undefined;
        }

        const blob = await response.blob();
        console.log('Logo blob loaded:', blob.size, 'bytes, type:', blob.type);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                console.log('Logo base64 loaded, length:', result?.length || 0);
                resolve(result);
            };
            reader.onerror = () => {
                console.error('FileReader error');
                reject(undefined);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading logo:', error);
        return undefined;
    }
}

/* ── Header with Logo ───────────────────────────────────── */

function drawHeader(doc: jsPDF, logoBase64: string | undefined, report: Report, lang: 'fr' | 'en'): number {
    let y = 15;

    // Brand color header bar
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, PAGE_WIDTH, 45, 'F');

    // Logo
    if (logoBase64) {
        try {
            console.log('Adding logo to PDF at position:', MARGIN, y);
            doc.addImage(logoBase64, 'PNG', MARGIN, y, 35, 35);
            console.log('Logo added successfully');
        } catch (error) {
            console.error('Failed to add logo to PDF:', error);
        }
    } else {
        console.warn('No logo data available for PDF');
    }

    // Company name and info
    const textX = logoBase64 ? MARGIN + 42 : MARGIN;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text("LIFE'S SIMPLE SARL", textX, y + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(240, 240, 240);
    doc.text('Yaounde, Cameroun', textX, y + 15);
    doc.text('contact@lis.cm  |  www.lis.cm', textX, y + 20);

    // Report title on the right
    const rightX = PAGE_WIDTH - MARGIN;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_LIGHT);
    const title = lang === 'fr' ? 'RAPPORT FINANCIER IA' : 'AI FINANCIAL REPORT';
    doc.text(title, rightX, y + 10, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 220, 220);
    doc.text(formatDate(report.createdAt, lang), rightX, y + 17, { align: 'right' });

    return 55;
}

/* ── Report Info Card ───────────────────────────────────── */

function drawReportInfo(doc: jsPDF, report: Report, data: AccountingReportData, lang: 'fr' | 'en', y: number): number {
    // Card background
    doc.setFillColor(...GRAY_50);
    doc.roundedRect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 35, 3, 3, 'F');

    // Border
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 35, 3, 3, 'S');

    doc.setFontSize(10);
    const col1 = MARGIN + 8;
    const col2 = PAGE_WIDTH / 2 + 5;
    let yy = y + 10;

    // Row 1: Fiscal Year & Period
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    doc.text(lang === 'fr' ? 'Exercice Fiscal' : 'Fiscal Year', col1, yy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_900);
    doc.text(data.fiscalYear?.name || '-', col1 + 45, yy);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    doc.text(lang === 'fr' ? 'Période' : 'Period', col2, yy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_900);
    const period = `${data.fiscalYear?.startDate || ''} - ${data.fiscalYear?.endDate || ''}`;
    doc.text(period, col2 + 30, yy);

    yy += 10;

    // Row 2: Status & Generated By
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    doc.text(lang === 'fr' ? 'Statut' : 'Status', col1, yy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_900);
    const status = data.fiscalYear?.status === 'OPEN'
        ? (lang === 'fr' ? 'Ouvert' : 'Open')
        : (lang === 'fr' ? 'Clôturé' : 'Closed');
    doc.text(status, col1 + 45, yy);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    doc.text(lang === 'fr' ? 'Généré par' : 'Generated by', col2, yy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_900);
    doc.text(report.generatedBy?.email || '-', col2 + 30, yy);

    return y + 42;
}

/* ── Section Header ─────────────────────────────────────── */

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
    doc.setFillColor(...BRAND_DARK);
    doc.rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(title, MARGIN + 4, y + 5.5);

    return y + 12;
}

/* ── KPI Cards ──────────────────────────────────────────── */

function drawKPIs(doc: jsPDF, data: AccountingReportData, lang: 'fr' | 'en', y: number): number {
    if (!data.kpis) return y;

    y = drawSectionHeader(doc, lang === 'fr' ? 'INDICATEURS CLÉS DE PERFORMANCE' : 'KEY PERFORMANCE INDICATORS', y);

    const cardWidth = (PAGE_WIDTH - 2 * MARGIN - 6) / 2; // 2 cards per row with gap
    const cardHeight = 22;
    const gap = 3;

    const kpis = [
        {
            label: lang === 'fr' ? 'Chiffre d\'affaires' : 'Total Revenue',
            value: formatXAF(data.kpis?.totalRevenue),
        },
        {
            label: lang === 'fr' ? 'Charges totales' : 'Total Expenses',
            value: formatXAF(data.kpis?.totalExpenses),
        },
        {
            label: lang === 'fr' ? 'Résultat net' : 'Net Income',
            value: formatXAF(data.kpis?.netIncome),
        },
        {
            label: lang === 'fr' ? 'Trésorerie' : 'Cash Balance',
            value: formatXAF(data.kpis?.cashBalance),
        },
        {
            label: lang === 'fr' ? 'Créances clients' : 'Receivables',
            value: formatXAF(data.kpis?.receivables),
        },
        {
            label: lang === 'fr' ? 'Dettes fournisseurs' : 'Payables',
            value: formatXAF(data.kpis?.payables),
        },
    ];

    let row = 0;
    let col = 0;

    for (const kpi of kpis) {
        const x = MARGIN + col * (cardWidth + gap);
        const cardY = y + row * (cardHeight + gap);

        // Card background
        doc.setFillColor(...WHITE);
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');

        // Border
        doc.setDrawColor(...GRAY_200);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'S');

        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_600);
        doc.text(kpi.label, x + 4, cardY + 7);

        // Value
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_DARK);
        doc.text(kpi.value, x + 4, cardY + 16);

        col++;
        if (col >= 2) {
            col = 0;
            row++;
        }
    }

    return y + Math.ceil(kpis.length / 2) * (cardHeight + gap) + 8;
}

/* ── Financial Statements ───────────────────────────────── */

function drawFinancialStatements(doc: jsPDF, data: AccountingReportData, lang: 'fr' | 'en', y: number): number {
    if (!data.incomeStatement || !data.balanceSheet) return y;

    y = drawSectionHeader(doc, lang === 'fr' ? 'ÉTATS FINANCIERS' : 'FINANCIAL STATEMENTS', y);

    // Income Statement Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    doc.text(lang === 'fr' ? 'Compte de Résultat' : 'Income Statement', MARGIN, y);
    y += 2;

    const incomeData = [
        [lang === 'fr' ? 'Produits d\'exploitation' : 'Operating Revenue', formatXAF(data.incomeStatement?.totalRevenue)],
        [lang === 'fr' ? 'Charges d\'exploitation' : 'Operating Expenses', formatXAF(data.incomeStatement?.totalExpenses)],
        [lang === 'fr' ? 'Résultat net' : 'Net Income', formatXAF(data.incomeStatement?.netIncome)],
    ];

    autoTable(doc, {
        startY: y,
        head: [],
        body: incomeData,
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
            lineColor: GRAY_200,
            lineWidth: 0.5,
        },
        columnStyles: {
            0: {
                fontStyle: 'bold',
                textColor: GRAY_900,
                cellWidth: 'auto',
            },
            1: {
                halign: 'right',
                fontStyle: 'bold',
                textColor: BRAND_DARK,
                cellWidth: 60,
            },
        },
        margin: { left: MARGIN, right: MARGIN },
        didDrawPage: () => {
            doc.setDrawColor(...GRAY_200);
        },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Balance Sheet Table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_DARK);
    doc.text(lang === 'fr' ? 'Bilan' : 'Balance Sheet', MARGIN, y);
    y += 2;

    const balanceData = [
        [lang === 'fr' ? 'Total actif' : 'Total Assets', formatXAF(data.balanceSheet?.totalAssets)],
        [lang === 'fr' ? 'Total passif' : 'Total Liabilities', formatXAF(data.balanceSheet?.totalLiabilities)],
        [lang === 'fr' ? 'Capitaux propres' : 'Equity', formatXAF(data.balanceSheet?.equity)],
        [
            lang === 'fr' ? 'Équilibre' : 'Balanced',
            data.balanceSheet?.isBalanced ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No')
        ],
    ];

    autoTable(doc, {
        startY: y,
        head: [],
        body: balanceData,
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
            lineColor: GRAY_200,
            lineWidth: 0.5,
        },
        columnStyles: {
            0: {
                fontStyle: 'bold',
                textColor: GRAY_900,
                cellWidth: 'auto',
            },
            1: {
                halign: 'right',
                fontStyle: 'bold',
                textColor: BRAND_DARK,
                cellWidth: 60,
            },
        },
        margin: { left: MARGIN, right: MARGIN },
    });

    return (doc as any).lastAutoTable.finalY + 12;
}

/* ── Monthly Trend Chart ────────────────────────────────── */

function drawMonthlyChart(doc: jsPDF, data: AccountingReportData, lang: 'fr' | 'en', y: number): number {
    if (!data.monthlySummary?.months || data.monthlySummary.months.length === 0) return y;

    y = drawSectionHeader(doc, lang === 'fr' ? 'TENDANCES MENSUELLES' : 'MONTHLY TRENDS', y);

    const chartHeight = 60;
    const chartWidth = PAGE_WIDTH - 2 * MARGIN - 8;
    const chartX = MARGIN + 4;
    const months = data.monthlySummary.months.slice(0, 12); // Max 12 months

    if (months.length === 0) return y;

    // Find max value for scaling
    const maxRevenue = Math.max(...months.map(m => m.revenue || 0));
    const maxExpenses = Math.max(...months.map(m => m.expenses || 0));
    const maxValue = Math.max(maxRevenue, maxExpenses, 1000000);

    const barWidth = (chartWidth - 10) / (months.length * 2 + 1);
    const scale = (chartHeight - 15) / maxValue;

    // Draw axes
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.5);
    doc.line(chartX, y + chartHeight, chartX + chartWidth, y + chartHeight); // X-axis
    doc.line(chartX, y, chartX, y + chartHeight); // Y-axis

    // Draw bars
    months.forEach((month, i) => {
        const x = chartX + (i * 2 + 1) * barWidth;
        const revenue = month.revenue || 0;
        const expenses = month.expenses || 0;

        // Revenue bar (teal)
        const revenueHeight = revenue * scale;
        doc.setFillColor(...BRAND_LIGHT);
        doc.rect(x, y + chartHeight - revenueHeight, barWidth * 0.8, revenueHeight, 'F');

        // Expenses bar (dark)
        const expensesHeight = expenses * scale;
        doc.setFillColor(...BRAND_DARK);
        doc.rect(x + barWidth, y + chartHeight - expensesHeight, barWidth * 0.8, expensesHeight, 'F');

        // Month label
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_600);
        const monthLabel = `M${month.month || i + 1}`;
        doc.text(monthLabel, x + barWidth, y + chartHeight + 4, { align: 'center' });
    });

    // Legend
    const legendY = y + chartHeight + 10;
    doc.setFontSize(7);

    // Revenue legend
    doc.setFillColor(...BRAND_LIGHT);
    doc.rect(chartX, legendY, 3, 3, 'F');
    doc.setTextColor(...GRAY_900);
    doc.text(lang === 'fr' ? 'Revenus' : 'Revenue', chartX + 5, legendY + 2.5);

    // Expenses legend
    doc.setFillColor(...BRAND_DARK);
    doc.rect(chartX + 30, legendY, 3, 3, 'F');
    doc.setTextColor(...GRAY_900);
    doc.text(lang === 'fr' ? 'Charges' : 'Expenses', chartX + 35, legendY + 2.5);

    return y + chartHeight + 18;
}

/* ── AI Analysis ────────────────────────────────────────── */

function drawAIAnalysis(doc: jsPDF, data: AccountingReportData, lang: 'fr' | 'en', y: number): number {
    if (!data.aiContent) return y;

    y = drawSectionHeader(doc, lang === 'fr' ? 'ANALYSE IA & RECOMMANDATIONS' : 'AI ANALYSIS & RECOMMENDATIONS', y);

    const textWidth = PAGE_WIDTH - 2 * MARGIN - 8;
    const ph = doc.internal.pageSize.getHeight();

    // Parse AI content into sections
    const headings = [
        'RÉSUMÉ EXÉCUTIF', 'EXECUTIVE SUMMARY',
        'ANALYSE DE LA PERFORMANCE FINANCIÈRE', 'FINANCIAL PERFORMANCE ANALYSIS',
        'ANALYSE DU BILAN', 'BALANCE SHEET ANALYSIS',
        'ANALYSE BUDGÉTAIRE', 'BUDGET ANALYSIS',
        'TRÉSORERIE ET CRÉANCES', 'CASH FLOW AND RECEIVABLES',
        'FISCALITÉ', 'TAX COMPLIANCE',
        'RECOMMANDATIONS STRATÉGIQUES', 'STRATEGIC RECOMMENDATIONS',
    ];

    let currentHeading = '';
    let currentContent = '';

    const lines = data.aiContent.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (headings.includes(trimmed)) {
            if (currentContent.trim()) {
                y = renderAISection(doc, currentHeading, currentContent.trim(), y, textWidth, ph);
            }
            currentHeading = trimmed;
            currentContent = '';
        } else {
            currentContent += line + '\n';
        }
    }

    if (currentContent.trim()) {
        y = renderAISection(doc, currentHeading, currentContent.trim(), y, textWidth, ph);
    }

    return y;
}

function renderAISection(doc: jsPDF, heading: string, content: string, y: number, textWidth: number, pageHeight: number): number {
    // Check page break
    if (y > pageHeight - 50) {
        doc.addPage();
        y = 25;
    }

    // Section heading
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_LIGHT);
    doc.text(heading, MARGIN + 4, y);
    y += 7;

    // Content
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_900);

    const paragraphs = content.split('\n\n');
    for (const para of paragraphs) {
        if (!para.trim()) continue;

        const lines = doc.splitTextToSize(para.trim(), textWidth);

        // Check if paragraph fits
        if (y + lines.length * 4.5 > pageHeight - 25) {
            doc.addPage();
            y = 25;
        }

        doc.text(lines, MARGIN + 4, y);
        y += lines.length * 4.5 + 4;
    }

    return y + 3;
}

/* ── Footer ─────────────────────────────────────────────── */

function addFooters(doc: jsPDF, reportId: string, lang: 'fr' | 'en'): void {
    const totalPages = doc.getNumberOfPages();
    const ph = doc.internal.pageSize.getHeight();

    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Footer line
        const footerY = ph - 12;
        doc.setDrawColor(...GRAY_200);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);

        // Footer text
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...GRAY_600);

        const footerText = lang === 'fr'
            ? `Rapport généré par LIFE'S SIMPLE SARL — Référence: ${reportId.substring(0, 8).toUpperCase()}`
            : `Report generated by LIFE'S SIMPLE SARL — Reference: ${reportId.substring(0, 8).toUpperCase()}`;

        doc.text(footerText, PAGE_WIDTH / 2, footerY + 5, { align: 'center' });
        doc.text(`Page ${p} / ${totalPages}`, PAGE_WIDTH - MARGIN, footerY + 5, { align: 'right' });
    }
}

/* ── Main Export ────────────────────────────────────────── */

export async function exportAccountingReportPdf(report: Report): Promise<void> {
    const data = report.reportData as AccountingReportData;
    if (!data) {
        throw new Error('No report data available');
    }

    const lang = getLang(report);
    const doc = new jsPDF('p', 'mm', 'a4');

    // Load logo
    const logoBase64 = await loadLogoBase64();

    // Build report
    let y = drawHeader(doc, logoBase64, report, lang);
    y = drawReportInfo(doc, report, data, lang, y);
    y = drawKPIs(doc, data, lang, y);

    // Page break check
    if (y > doc.internal.pageSize.getHeight() - 70) {
        doc.addPage();
        y = 25;
    }

    y = drawFinancialStatements(doc, data, lang, y);

    // Page break check
    if (y > doc.internal.pageSize.getHeight() - 90) {
        doc.addPage();
        y = 25;
    }

    y = drawMonthlyChart(doc, data, lang, y);

    // Page break check
    if (y > doc.internal.pageSize.getHeight() - 70) {
        doc.addPage();
        y = 25;
    }

    drawAIAnalysis(doc, data, lang, y);

    // Add footers to all pages
    addFooters(doc, report.id, lang);

    // Download
    const filename = `${report.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

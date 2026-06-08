import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Types ─────────────────────────────────────────────── */

export interface PayslipPdfData {
    /* Employee */
    employeeName: string;
    departmentName: string;
    position?: string;
    contractType?: string;
    riskClass?: number;

    /* Period */
    month: number;
    year: number;

    /* Salary bases */
    baseSalary?: number;
    grossSalary: number;
    grossCotisable?: number;
    grossTaxable?: number;
    netCategoriel?: number;

    /* 2026 CNPS breakdown */
    pvidEmployee?: number;
    pvidEmployer?: number;
    cnpsFamilyAllowance?: number;
    atmp?: number;

    /* CFC */
    cfcEmployee?: number;
    cfcEmployer?: number;

    /* FNE */
    fne?: number;

    /* Fiscal (employee) */
    irpp: number;
    cac?: number;
    rav?: number;
    tdl?: number;

    /* Legacy compat */
    cnpsEmployee?: number;
    cnpsEmployer?: number;
    cfc?: number;
    communalTax?: number;

    /* Aggregates */
    totalDeductions: number;
    totalEmployerCharges: number;
    manualDeductions: number;
    manualDeductionNote: string | null;
    customDeductions?: { name: string; amount: number }[];
    netSalary: number;

    /* Meta */
    payslipId: string;
    paidAt?: string;
    complianceWarnings?: string[];
}

/* ── Helpers ───────────────────────────────────────────── */

const MONTHS_FR = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const formatCurrency = (amount: number) => {
    const rounded = Math.round(amount * 100) / 100;
    const [intPart, decPart] = rounded.toFixed(2).split('.');
    const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const decimal = decPart === '00' ? '' : `,${decPart}`;
    return `${withSeparators}${decimal} FCFA`;
};

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

/* ── Number to French words ────────────────────────────── */

function numberToWordsFr(n: number): string {
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
        'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

    function below100(num: number): string {
        if (num < 20) return ones[num];
        const t = Math.floor(num / 10);
        const o = num % 10;
        if (t === 7) return 'soixante-' + ones[10 + o];
        if (t === 9) return 'quatre-vingt-' + (o > 0 ? ones[o] : '');
        if (t === 8) return 'quatre-vingt' + (o > 0 ? '-' + ones[o] : 's');
        return tens[t] + (o === 1 ? '-et-un' : o > 0 ? '-' + ones[o] : '');
    }

    function below1000(num: number): string {
        if (num < 100) return below100(num);
        const h = Math.floor(num / 100);
        const r = num % 100;
        const hWord = (h > 1 ? ones[h] + ' ' : '') + 'cent';
        if (r === 0) return hWord + (h > 1 ? 's' : '');
        return hWord + ' ' + below100(r);
    }

    const integer = Math.round(n);
    if (integer === 0) return 'zero';

    let result = '';
    let remaining = integer;

    if (remaining >= 1000000) {
        const m = Math.floor(remaining / 1000000);
        result += below1000(m) + (m > 1 ? ' millions ' : ' million ');
        remaining = remaining % 1000000;
    }

    if (remaining >= 1000) {
        const k = Math.floor(remaining / 1000);
        result += (k === 1 ? 'mille' : below1000(k) + ' mille') + ' ';
        remaining = remaining % 1000;
    }

    if (remaining > 0) {
        result += below1000(remaining);
    }

    return result.trim();
}

/* ── Main export ───────────────────────────────────────── */

export function exportPayslipPdf(data: PayslipPdfData, logoBase64?: string) {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const MARGIN = 16;
    const rightEdge = pw - MARGIN;

    // Brand colors
    const BRAND: [number, number, number] = [51, 203, 204];
    const DARK: [number, number, number] = [40, 56, 82];
    const LIGHT_BG: [number, number, number] = [248, 250, 252];

    let y = 14;

    /* ── Header: Logo + Company info ── */
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', MARGIN, y - 2, 18, 18);
    }

    const companyX = logoBase64 ? MARGIN + 22 : MARGIN;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text("LIFE'S SIMPLE SARL", companyX, y + 4);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Yaounde-Cameroun, Total Ecole de Police-Tsinga', companyX, y + 9);
    doc.text('NIU: M092518047262G  RCCM: CM-NSI-02-2025-B-01433', companyX, y + 13);
    doc.text('Tel: (+237) 689 79 19 43  E-mail: contact@lis.cm  Web: www.lis.cm', companyX, y + 17);

    /* ── Title: BULLETIN DE PAIE ── */
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('BULLETIN DE PAIE', rightEdge, y + 5, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(`${MONTHS_FR[data.month - 1]} ${data.year}`, rightEdge, y + 12, { align: 'right' });

    y += 26;

    /* ── Teal accent line ── */
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, rightEdge, y);
    doc.setLineWidth(0.2);
    y += 10;

    /* ── Employee info section ── */
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(MARGIN, y - 3, pw - MARGIN * 2, 22, 2, 2, 'F');

    const col1 = MARGIN + 4;
    const col2 = pw / 2 + 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('EMPLOYE', col1, y + 1);
    doc.text('INFORMATIONS', col2, y + 1);

    doc.setFontSize(9);
    doc.setTextColor(...DARK);

    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Nom:', col1, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(data.employeeName, col1 + 20, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Dept:', col1, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(data.departmentName || '-', col1 + 20, y + 13);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Periode:', col2, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${MONTHS_FR[data.month - 1]} ${data.year}`, col2 + 22, y + 7);

    if (data.paidAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Paye le:', col2, y + 13);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(data.paidAt), col2 + 22, y + 13);
    }

    y += 26;

    /* ── Employee detail info (position / contract / risk class) ── */
    const extraInfoParts: string[] = [];
    if (data.position) extraInfoParts.push(`Poste: ${data.position}`);
    if (data.contractType) extraInfoParts.push(`Contrat: ${data.contractType}`);
    if (data.riskClass) extraInfoParts.push(`Classe risque AT/MP: ${data.riskClass}`);
    if (extraInfoParts.length > 0) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(extraInfoParts.join('   |   '), MARGIN, y);
        y += 6;
    }

    /* ── Detect 2026 mode ── */
    const is2026 = data.pvidEmployee !== undefined || data.pvidEmployer !== undefined;

    /* ── Salary bases section (2026 only) ── */
    if (is2026 && (data.baseSalary || data.grossCotisable || data.netCategoriel)) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND);
        doc.text('BASES DE CALCUL', MARGIN, y);
        y += 2;

        const baseRows: string[][] = [];
        if (data.baseSalary) baseRows.push(['Salaire de base', formatCurrency(data.baseSalary)]);
        baseRows.push(['Salaire Brut Total', formatCurrency(data.grossSalary)]);
        if (data.grossCotisable !== undefined) baseRows.push(['Base cotisable CNPS/CFC', formatCurrency(data.grossCotisable)]);
        if (data.grossTaxable !== undefined) baseRows.push(['Base taxable IRPP (brut taxable)', formatCurrency(data.grossTaxable)]);
        if (data.netCategoriel !== undefined) baseRows.push(['Net categoriel (base IRPP nette)', formatCurrency(data.netCategoriel)]);

        autoTable(doc, {
            startY: y,
            head: [['Designation', 'Montant']],
            body: baseRows,
            theme: 'grid',
            headStyles: { fillColor: [80, 100, 130] as [number, number, number], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 },
            bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' } },
            margin: { left: MARGIN, right: MARGIN },
            didParseCell: (hookData) => {
                if (hookData.row.index === 1) {
                    hookData.cell.styles.fontStyle = 'bold';
                    hookData.cell.styles.fillColor = [240, 245, 248];
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    /* ── Deductions table ── */
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('RETENUES SALARIALES', MARGIN, y);
    y += 2;

    const customDeds = data.customDeductions || [];
    const customTotal = customDeds.reduce((s, d) => s + d.amount, 0);
    const allRetenues = data.totalDeductions + customTotal + (data.manualDeductions || 0);

    const deductionRows: string[][] = [];

    if (is2026) {
        // 2026 SYSCOHADA bulletin breakdown
        deductionRows.push(['Salaire Brut', '', '', formatCurrency(data.grossSalary)]);
        if ((data.pvidEmployee ?? 0) > 0)
            deductionRows.push(['PVID Salarial (Pension vieillesse)', '4,20%', formatCurrency(data.pvidEmployee!), '']);
        if ((data.cfcEmployee ?? 0) > 0)
            deductionRows.push(['CFC Salarial (Credit Foncier)', '1,00%', formatCurrency(data.cfcEmployee!), '']);
        if ((data.rav ?? 0) > 0)
            deductionRows.push(['RAV (Redevance Audiovisuelle)', 'Tranches', formatCurrency(data.rav!), '']);
        if ((data.tdl ?? 0) > 0)
            deductionRows.push(['TDL (Taxe Developpement Local)', 'Tranches', formatCurrency(data.tdl!), '']);
        if ((data.irpp ?? 0) > 0)
            deductionRows.push(['IRPP (Impot sur Revenu)', 'Progressif', formatCurrency(data.irpp), '']);
        if ((data.cac ?? 0) > 0)
            deductionRows.push(['CAC (Centimes Additionnels)', '10% IRPP', formatCurrency(data.cac!), '']);
    } else {
        // Legacy bulletin
        deductionRows.push(['Salaire Brut', '', '', formatCurrency(data.grossSalary)]);
        if ((data.cnpsEmployee ?? 0) > 0)
            deductionRows.push(['CNPS (Pension vieillesse)', '2,80%', formatCurrency(data.cnpsEmployee!), '']);
        if ((data.cfc ?? 0) > 0)
            deductionRows.push(['CFC (Credit Foncier)', '1,00%', formatCurrency(data.cfc!), '']);
        if ((data.irpp ?? 0) > 0)
            deductionRows.push(['IRPP (Impot sur le revenu)', 'Progressif', formatCurrency(data.irpp), '']);
        if ((data.communalTax ?? 0) > 0)
            deductionRows.push(['Centimes additionnels communaux', '10% IRPP', formatCurrency(data.communalTax!), '']);
    }

    for (const cd of customDeds) {
        if (cd.amount > 0) deductionRows.push([cd.name, '', formatCurrency(cd.amount), '']);
    }

    if (data.manualDeductions > 0) {
        const note = data.manualDeductionNote ? ` (${data.manualDeductionNote})` : '';
        deductionRows.push([`Retenue manuelle${note}`, '', formatCurrency(data.manualDeductions), '']);
    }

    deductionRows.push(['Total Retenues', '', '', formatCurrency(allRetenues)]);

    const totalDeductionRowIdx = deductionRows.length - 1;
    const firstRowIdx = 0;

    autoTable(doc, {
        startY: y,
        head: [['Designation', 'Taux / Base', 'Retenue', 'Montant']],
        body: deductionRows,
        theme: 'striped',
        headStyles: {
            fillColor: BRAND,
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: 3,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [50, 50, 50],
            cellPadding: 2.5,
        },
        alternateRowStyles: {
            fillColor: [245, 250, 250],
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 38, halign: 'right', textColor: [220, 50, 50] },
            3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: MARGIN, right: MARGIN },
        didParseCell: (hookData) => {
            const i = hookData.row.index;
            if (i === totalDeductionRowIdx || i === firstRowIdx) {
                hookData.cell.styles.fontStyle = 'bold';
                if (i === totalDeductionRowIdx) {
                    hookData.cell.styles.fillColor = [240, 245, 248];
                    hookData.cell.styles.textColor = [40, 56, 82];
                }
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    /* ── Employer charges section ── */
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('CHARGES PATRONALES', MARGIN, y);
    y += 2;

    const employerRows: string[][] = [];
    if (is2026) {
        if ((data.pvidEmployer ?? 0) > 0)
            employerRows.push(['PVID Patronal (Pension vieillesse)', '4,20%', formatCurrency(data.pvidEmployer!)]);
        if ((data.cnpsFamilyAllowance ?? 0) > 0)
            employerRows.push(['Allocations Familiales (PF)', '7,00%', formatCurrency(data.cnpsFamilyAllowance!)]);
        if ((data.atmp ?? 0) > 0) {
            const riskLabel = data.riskClass ? ` Cl.${data.riskClass}` : '';
            const atmpRates: Record<number, string> = { 1: '1,75%', 2: '2,50%', 3: '5,00%' };
            const atmpRate = data.riskClass ? (atmpRates[data.riskClass] ?? '-') : '-';
            employerRows.push([`AT/MP${riskLabel} (Accidents Travail)`, atmpRate, formatCurrency(data.atmp!)]);
        }
        if ((data.cfcEmployer ?? 0) > 0)
            employerRows.push(['CFC Patronal (Credit Foncier)', '1,50%', formatCurrency(data.cfcEmployer!)]);
        if ((data.fne ?? 0) > 0)
            employerRows.push(['FNE (Fonds National Emploi)', '1,00%', formatCurrency(data.fne!)]);
    } else {
        if ((data.cnpsEmployer ?? 0) > 0)
            employerRows.push(['CNPS Employeur (Pension vieillesse)', '11,20%', formatCurrency(data.cnpsEmployer!)]);
    }
    employerRows.push(['Total Charges Patronales', '', formatCurrency(data.totalEmployerCharges)]);

    const totalEmplRowIdx = employerRows.length - 1;

    autoTable(doc, {
        startY: y,
        head: [['Designation', 'Taux', 'Montant']],
        body: employerRows,
        theme: 'striped',
        headStyles: {
            fillColor: [180, 140, 50] as [number, number, number],
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: 3,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: [50, 50, 50],
            cellPadding: 2.5,
        },
        alternateRowStyles: {
            fillColor: [255, 250, 240],
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: MARGIN, right: MARGIN },
        didParseCell: (hookData) => {
            if (hookData.row.index === totalEmplRowIdx) {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fillColor = [255, 245, 225];
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    /* ── NET SALARY highlight box ── */
    const boxW = pw - MARGIN * 2;
    const boxH = 18;
    doc.setFillColor(...BRAND);
    doc.roundedRect(MARGIN, y, boxW, boxH, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('NET A PAYER', MARGIN + 6, y + 12);

    doc.setFontSize(16);
    doc.text(formatCurrency(data.netSalary), rightEdge - 6, y + 12.5, { align: 'right' });

    y += boxH + 8;

    /* ── Amount in words ── */
    const amountWords = numberToWordsFr(Math.round(data.netSalary));
    const amountWordsCapitalized = amountWords.charAt(0).toUpperCase() + amountWords.slice(1);
    const amountWordsText = `${amountWordsCapitalized} francs CFA`;
    const boxInnerW = pw - MARGIN * 2 - 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    const wrappedLines = doc.splitTextToSize(amountWordsText, boxInnerW);
    const wordsBoxH = 10 + wrappedLines.length * 6;

    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(MARGIN, y - 2, pw - MARGIN * 2, wordsBoxH, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Arreter le present bulletin a la somme de :', MARGIN + 4, y + 4);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(wrappedLines, MARGIN + 4, y + 10, { maxWidth: boxInnerW });

    y += wordsBoxH + 10;

    /* ── Summary row ── */
    const summaryData = [
        { label: 'Salaire Brut', value: formatCurrency(data.grossSalary), color: DARK },
        { label: 'Total Retenues', value: `- ${formatCurrency(allRetenues)}`, color: [200, 50, 50] as [number, number, number] },
        { label: 'Charges Patronales', value: formatCurrency(data.totalEmployerCharges), color: [180, 140, 50] as [number, number, number] },
        { label: 'Net a Payer', value: formatCurrency(data.netSalary), color: BRAND },
    ];

    const summaryBoxW = (pw - MARGIN * 2 - 9) / 4;

    summaryData.forEach((item, i) => {
        const x = MARGIN + i * (summaryBoxW + 3);
        doc.setFillColor(...LIGHT_BG);
        doc.roundedRect(x, y, summaryBoxW, 16, 1.5, 1.5, 'F');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(130, 130, 130);
        doc.text(item.label.toUpperCase(), x + summaryBoxW / 2, y + 5, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(...(item.color as [number, number, number]));
        doc.text(item.value, x + summaryBoxW / 2, y + 12, { align: 'center' });
    });

    y += 24;

    /* ── Compliance warnings (2026) ── */
    const warnings = data.complianceWarnings ?? [];
    if (warnings.length > 0) {
        doc.setFillColor(255, 245, 220);
        const warnBoxH = 6 + warnings.length * 5;
        doc.roundedRect(MARGIN, y, pw - MARGIN * 2, warnBoxH, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 100, 0);
        doc.text('ALERTES DE CONFORMITE:', MARGIN + 4, y + 5);
        doc.setFont('helvetica', 'normal');
        warnings.forEach((w, i) => {
            doc.text(`• ${w}`, MARGIN + 4, y + 10 + i * 5);
        });
        y += warnBoxH + 8;
    }

    /* ── Footer line ── */
    const ph = doc.internal.pageSize.getHeight();
    const footerY = ph - 14;

    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN, footerY - 3, rightEdge, footerY - 3);

    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.setFont('helvetica', 'italic');
    doc.text(
        "Document genere electroniquement - LIFE'S SIMPLE SARL - Confidentiel",
        pw / 2,
        footerY + 1,
        { align: 'center' },
    );

    doc.setFontSize(6);
    doc.text(
        `Ref: ${data.payslipId.substring(0, 8).toUpperCase()}`,
        pw / 2,
        footerY + 5,
        { align: 'center' },
    );

    /* ── Save ── */
    const filename = `Fiche_Paie_${data.employeeName.replace(/\s+/g, '_')}_${MONTHS_FR[data.month - 1]}_${data.year}.pdf`;
    doc.save(filename);
}

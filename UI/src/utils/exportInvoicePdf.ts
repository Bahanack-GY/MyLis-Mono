import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../api/invoices/types';
import type { InvoiceTemplate } from '../api/invoices/types';

/* ── Helpers ───────────────────────────────────────────── */

const formatCurrency = (amount: number) => {
    // Manual formatting to avoid non-breaking space chars that jsPDF renders as "/"
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
    if (integer === 0) return 'zéro';

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

/* ── Letterhead ────────────────────────────────────────── */

function drawLetterhead(doc: jsPDF, img: string) {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.addImage(img, 'PNG', 0, 0, pw, ph);
}

const LH_TOP = 42;   // mm below header zone
const LH_BOTTOM = 28; // mm above footer zone
const MARGIN = 20;     // left/right page margins

function ensureSpace(doc: jsPDF, y: number, needed: number, lhImg?: string): number {
    const ph = doc.internal.pageSize.getHeight();
    const limit = lhImg ? ph - LH_BOTTOM : ph - 15;
    if (y + needed > limit) {
        doc.addPage();
        if (lhImg) drawLetterhead(doc, lhImg);
        return lhImg ? LH_TOP : 20;
    }
    return y;
}


/* ── Main export ───────────────────────────────────────── */

export function exportInvoicePdf(
    invoice: Invoice,
    template?: InvoiceTemplate | null,
    letterheadImg?: string,
    signatureImg?: string,
    cachetImg?: string,
    isProforma?: boolean,
) {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const hasLH = !!letterheadImg;
    const rightEdge = pw - MARGIN;

    // Colors
    const BRAND: [number, number, number] = [51, 203, 204];
    const DARK: [number, number, number] = [40, 56, 82];

    // ── First page letterhead ──
    if (hasLH) drawLetterhead(doc, letterheadImg!);

    let y = hasLH ? LH_TOP : 20;

    // ── Company header (only without letterhead) ──
    if (!hasLH) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(template?.companyName || 'Company', MARGIN, y);
        y += 6;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        if (template?.address) { doc.text(template.address, MARGIN, y); y += 3.5; }
        if (template?.phone) { doc.text(template.phone, MARGIN, y); y += 3.5; }
        if (template?.email) { doc.text(template.email, MARGIN, y); y += 3.5; }
    }

    // ── Title block (right-aligned) ──
    const titleY = hasLH ? LH_TOP : 20;
    const docIsProforma = isProforma === true || invoice.type === 'PROFORMA';
    const docIsAcompte = invoice.type === 'ACOMPTE';
    const docTitle = docIsAcompte ? "FACTURE D'ACOMPTE" : docIsProforma ? 'PROFORMA' : 'FACTURE';
    const docNumber = docIsAcompte ? (invoice.acompteNumber || '') : docIsProforma ? (invoice.proformaNumber || '') : (invoice.invoiceNumber || '');
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text(docTitle, rightEdge, titleY, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    if (docNumber) doc.text(docNumber, rightEdge, titleY + 9, { align: 'right' });

    y = Math.max(y, titleY + 14) + 8;

    // ── Teal accent line ──
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, rightEdge, y);
    doc.setLineWidth(0.2);
    y += 12;

    // ── Two-column info: Dates (left) | Client (right) ──
    const colRight = pw / 2 + 10;

    // Left column - Dates
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('DATES', MARGIN, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Emission:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.issueDate), MARGIN + 25, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Echeance:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.dueDate), MARGIN + 25, y);

    // Right column - Client (same y-level as dates start)
    const clientY = y - 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('FACTURER A', colRight, clientY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(invoice.client?.name || '-', colRight, clientY + 5);

    if (invoice.project?.name) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Projet: ${invoice.project.name}`, colRight, clientY + 10);
    }

    y += 12;

    // ── Items Table ──
    const items = (invoice.items && invoice.items.length > 0)
        ? invoice.items
        : invoice.type === 'ACOMPTE'
            ? [{ description: invoice.notes || `Acompte sur facture`, quantity: 1, unitPrice: Number(invoice.total), amount: Number(invoice.total) }]
            : [];
    const tableBody = items.map(item => [
        item.description,
        String(Number(item.quantity)),
        formatCurrency(item.unitPrice),
        formatCurrency(item.amount),
    ]);

    let isFirstTablePage = true;

    autoTable(doc, {
        startY: y,
        head: [['Description', 'Qte', 'Prix unitaire', 'Montant']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
            fillColor: BRAND,
            textColor: 255,
            fontSize: 8.5,
            fontStyle: 'bold',
            cellPadding: 4,
        },
        bodyStyles: {
            fontSize: 8.5,
            textColor: [50, 50, 50],
            cellPadding: 3.5,
        },
        alternateRowStyles: {
            fillColor: [245, 250, 250],
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 18, halign: 'center' },
            2: { cellWidth: 38, halign: 'right' },
            3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
        },
        margin: {
            left: MARGIN,
            right: MARGIN,
            top: hasLH ? LH_TOP : 20,
            bottom: hasLH ? LH_BOTTOM : 20,
        },
        willDrawPage: () => {
            if (hasLH) {
                if (isFirstTablePage) {
                    isFirstTablePage = false;
                } else {
                    drawLetterhead(doc, letterheadImg!);
                }
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Totals box ──
    y = ensureSpace(doc, y, 35, letterheadImg);
    const totalsBoxX = pw - MARGIN - 75;
    const totalsBoxW = 75;

    // Light background for totals
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsBoxX - 2, y - 3, totalsBoxW + 4, 32, 2, 2, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Sous-total:', totalsBoxX, y + 2);
    doc.text(formatCurrency(Number(invoice.subtotal)), rightEdge, y + 2, { align: 'right' });

    doc.text(`TVA (${Number(invoice.taxRate)}%):`, totalsBoxX, y + 8);
    doc.text(formatCurrency(Number(invoice.taxAmount)), rightEdge, y + 8, { align: 'right' });

    // Separator
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.5);
    doc.line(totalsBoxX, y + 13, rightEdge, y + 13);
    doc.setLineWidth(0.2);

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Total:', totalsBoxX, y + 22);
    doc.setTextColor(...BRAND);
    doc.text(formatCurrency(Number(invoice.total)), rightEdge, y + 22, { align: 'right' });

    y += 40;

    // ── Amount in words ──
    const amountWords = numberToWordsFr(Number(invoice.total));
    const amountWordsCapitalized = amountWords.charAt(0).toUpperCase() + amountWords.slice(1);
    const amountWordsText = `${amountWordsCapitalized} francs CFA`;
    const boxInnerW = pw - MARGIN * 2 - 6;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    const wrappedLines = doc.splitTextToSize(amountWordsText, boxInnerW);
    const boxH = 10 + wrappedLines.length * 6.5;

    y = ensureSpace(doc, y, boxH + 4, letterheadImg);

    doc.setFillColor(245, 250, 252);
    doc.roundedRect(MARGIN, y - 3, pw - MARGIN * 2, boxH, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const docLabel = docIsAcompte ? "facture d'acompte" : docIsProforma ? 'proforma' : 'facture';
    doc.text(`Arrêter le montant de la présente ${docLabel} à la somme de :`, MARGIN + 3, y + 4);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    if (wrappedLines.length > 0) doc.text(wrappedLines, MARGIN + 3, y + 11, { maxWidth: boxInnerW });

    y += boxH + 4;

    // ── Reste à payer (acompte only) ──
    if (docIsAcompte && invoice.parentInvoice) {
        const parentTotal = Number(invoice.parentInvoice.total);
        const resteAPayer = Math.max(0, parentTotal - Number(invoice.total));
        y = ensureSpace(doc, y, 20, letterheadImg);

        doc.setFillColor(255, 248, 230);
        doc.roundedRect(MARGIN, y - 3, pw - MARGIN * 2, 22, 2, 2, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(`Facture ${invoice.parentInvoice.invoiceNumber || ''} - Montant total :`, MARGIN + 3, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(formatCurrency(parentTotal), rightEdge, y + 4, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.text('Acompte verse :', MARGIN + 3, y + 11);
        doc.setTextColor(51, 203, 204);
        doc.text(`- ${formatCurrency(Number(invoice.total))}`, rightEdge, y + 11, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('Reste a payer :', MARGIN + 3, y + 18);
        doc.setFontSize(10);
        doc.setTextColor(40, 56, 82);
        doc.text(formatCurrency(resteAPayer), rightEdge, y + 18, { align: 'right' });

        y += 28;
    }

    // ── Notes ──
    if (invoice.notes) {
        y = ensureSpace(doc, y, 20, letterheadImg);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND);
        doc.text('NOTES', MARGIN, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(invoice.notes, MARGIN, y, { maxWidth: pw - MARGIN * 2 });
        y += 10;
    }

    // ── Payment Terms ──
    if (template?.paymentTerms) {
        y = ensureSpace(doc, y, 15, letterheadImg);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND);
        doc.text('CONDITIONS DE PAIEMENT', MARGIN, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(template.paymentTerms, MARGIN, y, { maxWidth: pw - MARGIN * 2 });
        y += 8;
    }

    // ── Bottom section: Payment Info (left) + Signature & Cachet (right) ──
    const sigW = 45;
    const sigH = 22;
    const cachetSize = 30;
    const rightColW = cachetSize + sigW - 10 + 4; // width of sig+cachet block
    const rightColX = rightEdge - rightColW;
    const leftColW = rightColX - MARGIN - 6;

    const BANK_ROWS = [
        { key: 'Nom du Compte', value: 'LIFE S SIMPLE SARL' },
        { key: 'Numéro de compte', value: '40008172011' },
        { key: 'Nom de la Banque', value: 'BGFI' },
        { key: 'Code', value: 'BGFICMCX' },
    ];
    const hasSigOrCachet = !!(signatureImg || cachetImg);

    {
        const estimatedH = Math.max(12 + BANK_ROWS.length * 8 + 18, hasSigOrCachet ? 5 + sigH + 6 : 0);
        y = ensureSpace(doc, y, estimatedH + 6, letterheadImg);

        const blockStartY = y;

        // ── Left: Payment Info ──
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('Informations de Paiement', MARGIN, y);
        y += 4;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(
            'Vous pouvez payer par cheque ou virement bancaire en utilisant les coordonnees suivantes :',
            MARGIN, y + 3,
            { maxWidth: leftColW },
        );
        y += 8;

        autoTable(doc, {
            startY: y,
            body: BANK_ROWS.map(r => [r.key, r.value]),
            theme: 'grid',
            styles: { fontSize: 8.5, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [40, 56, 82], cellWidth: 42 },
                1: { textColor: [50, 50, 50] },
            },
            tableWidth: leftColW,
            margin: { left: MARGIN, right: pw - MARGIN - leftColW },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

        // ── Right: La direction + Signature + Cachet ──
        if (hasSigOrCachet) {
            const sigX = rightEdge - sigW;
            const cachetX = sigX - cachetSize + 10;
            const blockCenterX = (cachetX + rightEdge) / 2;
            const sigY = blockStartY + 5;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            doc.text('La direction', blockCenterX, blockStartY, { align: 'center' });

            if (signatureImg) {
                doc.addImage(signatureImg, 'PNG', sigX, sigY, sigW, sigH);
            }
            if (cachetImg) {
                doc.addImage(cachetImg, 'PNG', cachetX, sigY - 2, cachetSize, cachetSize);
            }

            y = Math.max(y, sigY + sigH + 4);
        }

        y += 6;
    }

    // ── Footer (only without letterhead) ──
    if (!hasLH && template?.footerText) {
        const footerY = ph - 12;
        doc.setDrawColor(220, 220, 220);
        doc.line(MARGIN, footerY - 4, rightEdge, footerY - 4);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text(template.footerText, pw / 2, footerY, { align: 'center' });
    }

    const filename = docIsAcompte
        ? (invoice.acompteNumber || 'acompte')
        : docIsProforma
            ? (invoice.proformaNumber || 'proforma')
            : (invoice.invoiceNumber || 'facture');
    doc.save(`${filename}.pdf`);
}

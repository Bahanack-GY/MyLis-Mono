import { jsPDF } from 'jspdf';

const BRAND: [number, number, number] = [51, 203, 204];
const DARK: [number, number, number] = [40, 56, 82];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

function loadLogoBase64(): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = '/src/assets/Logo.png';
  });
}

/* ─── Leave Request PDF ─────────────────────────────────────── */

export interface LeaveAbsencePdfData {
  employeeName: string;
  employeeId?: string;
  department?: string;
  type: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason?: string | null;
  approvedByName?: string;
  approvedAt?: string | null;
  requestedAt: string;
  companyName?: string;
}

export async function exportLeaveAbsencePdf(data: LeaveAbsencePdfData) {
  const logo = await loadLogoBase64();
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 18;
  const rightEdge = pw - M;
  let y = 0;

  /* ── Header band ── */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 38, 'F');

  if (logo) {
    doc.addImage(logo, 'PNG', M, 7, 20, 20);
  }

  const companyX = logo ? M + 24 : M;
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.companyName || 'MyLIS', companyX, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Système de Gestion des Ressources Humaines', companyX, 22);

  /* Document title right-aligned */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AUTORISATION DE CONGÉ', rightEdge, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Réf. : CONG-${data.requestedAt.slice(0, 10).replace(/-/g, '')}`, rightEdge, 22, { align: 'right' });
  doc.setTextColor(...GRAY);
  doc.text(`Émis le : ${fmt(data.requestedAt)}`, rightEdge, 28, { align: 'right' });

  y = 50;

  /* ── Status badge ── */
  doc.setFillColor(...BRAND);
  doc.roundedRect(M, y - 5, 60, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('✓  APPROUVÉ', M + 30, y + 1.5, { align: 'center' });

  y += 14;

  /* ── Employee section ── */
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, pw - 2 * M, 28, 3, 3, 'F');

  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('EMPLOYÉ', M + 5, y + 7);

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.employeeName, M + 5, y + 16);

  if (data.department) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(data.department, M + 5, y + 23);
  }

  y += 36;

  /* ── Details grid ── */
  const colW = (pw - 2 * M) / 2 - 3;

  const drawCell = (x: number, cy: number, label: string, value: string, w = colW) => {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(x, cy, w, 22, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + 5, cy + 7);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(value, x + 5, cy + 16);
  };

  const TYPE_LABELS: Record<string, string> = {
    ANNUAL: 'Congé annuel',
    SICK: 'Congé maladie',
    MATERNITY: 'Congé maternité',
    PATERNITY: 'Congé paternité',
    UNPAID: 'Congé sans solde',
    OTHER: 'Autre',
  };

  drawCell(M, y, 'Type de congé', TYPE_LABELS[data.type] || data.type);
  drawCell(M + colW + 6, y, 'Durée', `${data.numberOfDays} jour${data.numberOfDays > 1 ? 's' : ''} ouvrés`);
  y += 28;

  drawCell(M, y, 'Date de début', fmt(data.startDate));
  drawCell(M + colW + 6, y, 'Date de fin', fmt(data.endDate));
  y += 28;

  /* ── Reason ── */
  if (data.reason) {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(230, 230, 230);
    const reasonLines = doc.splitTextToSize(data.reason, pw - 2 * M - 10);
    const reasonH = Math.max(22, 12 + reasonLines.length * 5);
    doc.roundedRect(M, y, pw - 2 * M, reasonH, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('MOTIF', M + 5, y + 7);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(reasonLines, M + 5, y + 14);
    y += reasonH + 6;
  }

  y += 4;

  /* ── Approval section ── */
  doc.setFillColor(236, 253, 245); // light green tint
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(M, y, pw - 2 * M, 28, 3, 3, 'FD');

  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('APPROUVÉ PAR', M + 5, y + 8);

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.approvedByName || '—', M + 5, y + 17);

  if (data.approvedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Le ${fmt(data.approvedAt)}`, M + 5, y + 24);
  }

  /* Stamp circle placeholder */
  const stampX = rightEdge - 20;
  const stampY = y + 14;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1.2);
  doc.circle(stampX, stampY, 14, 'S');
  doc.setDrawColor(...BRAND);
  doc.circle(stampX, stampY, 11.5, 'S');
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('VALIDÉ', stampX, stampY - 2, { align: 'center' });
  doc.text('RH', stampX, stampY + 3.5, { align: 'center' });

  y += 36;

  /* ── Signature line ── */
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 70, y);
  doc.line(rightEdge - 70, y, rightEdge, y);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("Signature de l'employé", M + 35, y + 5, { align: 'center' });
  doc.text('Signature RH / Direction', rightEdge - 35, y + 5, { align: 'center' });

  /* ── Footer ── */
  doc.setFillColor(...DARK);
  doc.rect(0, ph - 14, pw, 14, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Document généré automatiquement — MyLIS • Système de Gestion RH',
    pw / 2,
    ph - 6,
    { align: 'center' },
  );

  doc.save(`conge_${data.employeeName.replace(/\s+/g, '_')}_${data.startDate}.pdf`);
}

/* ─── Permission d'Absence PDF ──────────────────────────────── */

export interface PermissionAbsencePdfData {
  employeeName: string;
  department?: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  reason: string;
  approvedByName?: string;
  approvedAt?: string | null;
  requestedAt: string;
  companyName?: string;
}

export async function exportPermissionAbsencePdf(data: PermissionAbsencePdfData) {
  const logo = await loadLogoBase64();
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 18;
  const rightEdge = pw - M;
  let y = 0;

  /* ── Header band ── */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 38, 'F');

  if (logo) {
    doc.addImage(logo, 'PNG', M, 7, 20, 20);
  }

  const companyX = logo ? M + 24 : M;
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.companyName || 'MyLIS', companyX, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Système de Gestion des Ressources Humaines', companyX, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("PERMISSION D'ABSENCE", rightEdge, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Réf. : PERM-${data.requestedAt.slice(0, 10).replace(/-/g, '')}`, rightEdge, 22, { align: 'right' });
  doc.setTextColor(...GRAY);
  doc.text(`Émis le : ${fmt(data.requestedAt)}`, rightEdge, 28, { align: 'right' });

  y = 50;

  /* ── Status badge ── */
  doc.setFillColor(...BRAND);
  doc.roundedRect(M, y - 5, 60, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('✓  APPROUVÉE', M + 30, y + 1.5, { align: 'center' });

  y += 14;

  /* ── Employee section ── */
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, pw - 2 * M, 28, 3, 3, 'F');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('EMPLOYÉ', M + 5, y + 7);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.employeeName, M + 5, y + 16);
  if (data.department) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(data.department, M + 5, y + 23);
  }

  y += 36;

  /* ── Details ── */
  const colW = (pw - 2 * M) / 2 - 3;

  const drawCell = (x: number, cy: number, label: string, value: string, w = colW) => {
    doc.setFillColor(...WHITE);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(x, cy, w, 22, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + 5, cy + 7);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(value, x + 5, cy + 16);
  };

  drawCell(M, y, "Date de l'absence", fmt(data.date), pw - 2 * M);
  y += 28;

  drawCell(M, y, 'Heure de départ', data.startTime);
  drawCell(M + colW + 6, y, 'Heure de retour', data.endTime);
  y += 28;

  drawCell(M, y, 'Durée totale', `${data.durationHours} heure${data.durationHours > 1 ? 's' : ''}`, pw - 2 * M);
  y += 28;

  /* ── Reason ── */
  const reasonLines = doc.splitTextToSize(data.reason, pw - 2 * M - 10);
  const reasonH = Math.max(22, 12 + reasonLines.length * 5);
  doc.setFillColor(...WHITE);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(M, y, pw - 2 * M, reasonH, 2, 2, 'FD');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('MOTIF', M + 5, y + 7);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(reasonLines, M + 5, y + 14);
  y += reasonH + 10;

  /* ── Approval ── */
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(M, y, pw - 2 * M, 28, 3, 3, 'FD');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('APPROUVÉE PAR', M + 5, y + 8);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.approvedByName || '—', M + 5, y + 17);
  if (data.approvedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Le ${fmt(data.approvedAt)}`, M + 5, y + 24);
  }

  const stampX = rightEdge - 20;
  const stampY = y + 14;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1.2);
  doc.circle(stampX, stampY, 14, 'S');
  doc.circle(stampX, stampY, 11.5, 'S');
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('VALIDÉ', stampX, stampY - 2, { align: 'center' });
  doc.text('RH', stampX, stampY + 3.5, { align: 'center' });

  y += 36;

  /* ── Signature line ── */
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 70, y);
  doc.line(rightEdge - 70, y, rightEdge, y);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("Signature de l'employé", M + 35, y + 5, { align: 'center' });
  doc.text('Signature RH / Direction', rightEdge - 35, y + 5, { align: 'center' });

  /* ── Footer ── */
  doc.setFillColor(...DARK);
  doc.rect(0, ph - 14, pw, 14, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Document généré automatiquement — MyLIS • Système de Gestion RH',
    pw / 2,
    ph - 6,
    { align: 'center' },
  );

  doc.save(`autorisation_${data.employeeName.replace(/\s+/g, '_')}_${data.date}.pdf`);
}

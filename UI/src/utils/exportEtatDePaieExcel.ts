import * as XLSX from 'xlsx';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface SalaryComponent {
  type: string;
  label: string;
  amount: number;
}

interface ExportPayslip {
  employeeId: string;
  grossSalary: number;
  baseSalary?: number;
  /* 2026 CNPS */
  pvidEmployee?: number;
  cnpsFamilyAllowance?: number;
  atmp?: number;
  /* 2026 CFC / FNE */
  cfcEmployee?: number;
  fne?: number;
  /* Fiscal */
  irpp?: number;
  cac?: number;
  rav?: number;
  tdl?: number;
  /* Legacy */
  cnpsEmployee?: number;
  cfc?: number;
  communalTax?: number;
  /* Manual */
  manualDeductions?: number;
  customDeductions?: { name: string; amount: number }[];
  /* Aggregates */
  totalDeductions: number;
  netSalary: number;
  employee?: {
    firstName: string;
    lastName: string;
    salary?: number;
    department?: { name: string };
  };
  salaryComponents: SalaryComponent[];
}

interface ExportPayload {
  month: number;
  year: number;
  status: string;
  payslips: ExportPayslip[];
}

function n(v: number | undefined | null): number {
  return Number(v) || 0;
}

export function exportEtatDePaieExcel(data: ExportPayload): void {
  const monthLabel = `${MONTHS[data.month - 1]} ${data.year}`;

  const rows = data.payslips.map((ps, idx) => {
    const emp = ps.employee;
    const name = emp ? `${emp.firstName} ${emp.lastName}` : '—';
    const dept = emp?.department?.name ?? '—';
    const base = n(ps.baseSalary) || n(emp?.salary);

    // Components breakdown
    const primes = ps.salaryComponents
      .filter(c => ['PRIME', 'INDEMNITE', 'AVANTAGE_NATURE'].includes(c.type) && c.amount > 0)
      .reduce((s, c) => s + c.amount, 0);

    const retenuesDiverses = ps.salaryComponents
      .filter(c => c.type === 'RETENUE' || c.amount < 0)
      .reduce((s, c) => s + Math.abs(c.amount), 0)
      + (ps.customDeductions ?? []).reduce((s, d) => s + n(d.amount), 0)
      + n(ps.manualDeductions);

    // Legal deductions (prefer 2026 fields, fall back to legacy)
    const cnps = n(ps.pvidEmployee) || n(ps.cnpsEmployee);
    const allocFam = n(ps.cnpsFamilyAllowance);
    const atmp = n(ps.atmp);
    const cfc = n(ps.cfcEmployee) || n(ps.cfc);
    const fne = n(ps.fne);
    const irpp = n(ps.irpp);
    const cac = n(ps.cac);
    const ravTdl = n(ps.rav) + n(ps.tdl) + n(ps.communalTax);

    return {
      'N°': idx + 1,
      'Employé': name,
      'Département': dept,
      'Salaire de base (XAF)': base || n(ps.grossSalary),
      'Primes & Indemnités (XAF)': primes,
      'Salaire Brut (XAF)': n(ps.grossSalary),
      'CNPS Salarié (XAF)': cnps,
      'Alloc. Familiales (XAF)': allocFam,
      'ATMP (XAF)': atmp,
      'CFC Salarié (XAF)': cfc,
      'FNE (XAF)': fne,
      'IRPP (XAF)': irpp,
      'CAC (XAF)': cac,
      'RAV / TDL (XAF)': ravTdl,
      'Retenus Diverses (XAF)': retenuesDiverses,
      'Total Retenus (XAF)': n(ps.totalDeductions),
      'Net à Payer (XAF)': n(ps.netSalary),
    };
  });

  // Totals row
  const totals: Record<string, string | number> = { 'N°': '', 'Employé': 'TOTAL', 'Département': '' };
  const numCols = [
    'Salaire de base (XAF)', 'Primes & Indemnités (XAF)', 'Salaire Brut (XAF)',
    'CNPS Salarié (XAF)', 'Alloc. Familiales (XAF)', 'ATMP (XAF)', 'CFC Salarié (XAF)',
    'FNE (XAF)', 'IRPP (XAF)', 'CAC (XAF)', 'RAV / TDL (XAF)',
    'Retenus Diverses (XAF)', 'Total Retenus (XAF)', 'Net à Payer (XAF)',
  ];
  for (const col of numCols) {
    totals[col] = rows.reduce((s, r) => s + (n(r[col as keyof typeof r] as number)), 0);
  }

  const ws = XLSX.utils.json_to_sheet([], { skipHeader: true });

  // Title rows
  XLSX.utils.sheet_add_aoa(ws, [
    [`ÉTAT DE PAIE — ${monthLabel.toUpperCase()}`],
    [`Généré le ${new Date().toLocaleDateString('fr-FR')} | Statut: ${data.status}`],
    [],
  ], { origin: 'A1' });

  // Headers + data + totals
  XLSX.utils.sheet_add_json(ws, [...rows, totals], { origin: 'A4' });

  // Column widths
  ws['!cols'] = [
    { wch: 5 },  // N°
    { wch: 24 }, // Employé
    { wch: 18 }, // Département
    { wch: 20 }, // Salaire de base
    { wch: 22 }, // Primes
    { wch: 20 }, // Brut
    { wch: 18 }, // CNPS
    { wch: 20 }, // Alloc
    { wch: 12 }, // ATMP
    { wch: 16 }, // CFC
    { wch: 12 }, // FNE
    { wch: 14 }, // IRPP
    { wch: 12 }, // CAC
    { wch: 16 }, // RAV/TDL
    { wch: 20 }, // Retenus Diverses
    { wch: 18 }, // Total Retenus
    { wch: 18 }, // Net
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'État de paie');

  const filename = `etat_de_paie_${MONTHS[data.month - 1].toLowerCase()}_${data.year}.xlsx`;
  XLSX.writeFile(wb, filename);
}

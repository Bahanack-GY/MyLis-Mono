import * as XLSX from 'xlsx';
import type { Employee } from '../api/employees/types';

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé',
  HEAD_OF_DEPARTMENT: 'Chef de département',
  ACCOUNTANT: 'Comptable',
  COMMERCIAL: 'Commercial',
  STAGIAIRE: 'Stagiaire',
  CEO: 'Directeur',
  RH: 'RH',
};

const CONTRACT_LABELS: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  CDII: 'CDII',
  STAGE: 'Stage',
};

function fmt(date?: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR');
}

export function exportEmployeesExcel(employees: Employee[], filename = 'employes'): void {
  const rows = employees.map(e => ({
    'Prénom': e.firstName,
    'Nom': e.lastName,
    'Email': e.user?.email ?? '',
    'Rôle': ROLE_LABELS[e.user?.role ?? ''] ?? e.user?.role ?? '',
    'Département': e.department?.name ?? '',
    'Poste': e.position?.title ?? '',
    'Téléphone': e.phoneNumber ?? '',
    'Adresse': e.address ?? '',
    'Date de naissance': fmt(e.birthDate),
    "Date d'embauche": fmt(e.hireDate),
    'Salaire (XAF)': e.salary ?? '',
    'Contrat': CONTRACT_LABELS[e.contractType as string] ?? (e as any).contractType ?? '',
    'Compétences': (e.skills ?? []).join(', '),
    'Encadreur': e.encadreur ? `${e.encadreur.firstName} ${e.encadreur.lastName}` : '',
    'Statut': e.dismissed ? 'Renvoyé' : 'Actif',
    'Date de renvoi': fmt(e.dismissedAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, // Prénom
    { wch: 16 }, // Nom
    { wch: 28 }, // Email
    { wch: 20 }, // Rôle
    { wch: 20 }, // Département
    { wch: 22 }, // Poste
    { wch: 16 }, // Téléphone
    { wch: 28 }, // Adresse
    { wch: 16 }, // Date naissance
    { wch: 16 }, // Date embauche
    { wch: 16 }, // Salaire
    { wch: 10 }, // Contrat
    { wch: 40 }, // Compétences
    { wch: 24 }, // Encadreur
    { wch: 10 }, // Statut
    { wch: 14 }, // Date renvoi
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employés');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}

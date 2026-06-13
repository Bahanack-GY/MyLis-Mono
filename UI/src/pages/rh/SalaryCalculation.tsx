import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  CalculatorIcon,
  UserGroupIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  ArrowRight01Icon,
  Settings01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Money01Icon,
  Cancel01Icon,
  Add01Icon,
  Loading02Icon,
} from 'hugeicons-react';
import { useRhSalaryPreview, useApplyRhSalary, useAppliedComponents } from '../../api/rh-salary/hooks';
import type { PointsBracket, EmployeeAdjustment, ManualLine, ManualEmployeeAdjustment } from '../../api/rh-salary/types';
import { DEFAULT_BRACKETS } from '../../api/rh-salary/types';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function pct(f: number): string {
  const p = Math.round(f * 100);
  return (p > 0 ? '+' : '') + p + '%';
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
      {initials}
    </div>
  );
}

/* ── Brackets editor ─────────────────────────────────────────────────── */

function BracketEditor({ brackets, onChange }: { brackets: PointsBracket[]; onChange: (b: PointsBracket[]) => void }) {
  const update = (i: number, field: keyof PointsBracket, val: string) => {
    onChange(brackets.map((b, idx) => {
      if (idx !== i) return b;
      if (field === 'factor') return { ...b, factor: parseFloat(val) / 100 };
      if (field === 'minPoints') return { ...b, minPoints: parseInt(val, 10) };
      if (field === 'maxPoints') return { ...b, maxPoints: val === '' ? null : parseInt(val, 10) };
      return b;
    }));
  };
  const inputCls = 'w-full bg-white border border-gray-200 px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-[#33cbcc] transition-colors';
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-1">
        <span>Pts min</span><span>Pts max</span><span>Ajust. %</span><span></span>
      </div>
      {brackets.map((b, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-center">
          <input type="number" value={b.minPoints} onChange={e => update(i, 'minPoints', e.target.value)} className={inputCls} />
          <input type="number" placeholder="∞" value={b.maxPoints ?? ''} onChange={e => update(i, 'maxPoints', e.target.value)} className={inputCls} />
          <input type="number" step="0.5" value={Math.round(b.factor * 100)} onChange={e => update(i, 'factor', e.target.value)} className={inputCls} />
          <button onClick={() => onChange(brackets.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors flex justify-center">
            <Cancel01Icon size={14} />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...brackets, { minPoints: 0, maxPoints: null, factor: 0 }])} className="flex items-center gap-1 text-xs text-[#33cbcc] hover:text-[#2bb5b6] transition-colors mt-1 font-medium">
        <Add01Icon size={12} /> Ajouter un palier
      </button>
    </div>
  );
}

/* ── Manual lines editor (primes or retenus) ────────────────────────── */

function ManualLinesEditor({
  lines, onChange, accent, placeholder,
}: {
  lines: ManualLine[];
  onChange: (lines: ManualLine[]) => void;
  accent: string;
  placeholder: string;
}) {
  const update = (i: number, field: keyof ManualLine, val: string) => {
    onChange(lines.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'amount' ? Number(val) : val } : l
    ));
  };
  const add = () => onChange([...lines, { label: '', amount: 0 }]);
  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            type="text"
            placeholder={placeholder}
            value={l.label}
            onChange={e => update(i, 'label', e.target.value)}
            className="flex-1 bg-white border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors min-w-0"
          />
          <input
            type="number"
            placeholder="Montant"
            value={l.amount || ''}
            onChange={e => update(i, 'amount', e.target.value)}
            className="w-28 bg-white border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors"
          />
          <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
            <Cancel01Icon size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className={`flex items-center gap-1 text-[11px] font-medium ${accent} transition-colors`}
      >
        <Add01Icon size={11} /> Ajouter
      </button>
    </div>
  );
}

/* ── Employee row ───────────────────────────────────────────────────── */

interface EmployeeRowProps {
  adj: EmployeeAdjustment;
  manual: ManualEmployeeAdjustment;
  onManualChange: (m: ManualEmployeeAdjustment) => void;
}

function EmployeeRow({ adj, manual, onManualChange }: EmployeeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const manualPrimesTotal = manual.primes.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const manualRetenusTotal = manual.retenus.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const hasManual = manualPrimesTotal > 0 || manualRetenusTotal > 0 || manual.primes.length > 0 || manual.retenus.length > 0;

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={adj.employeeName} url={adj.avatarUrl} />
            <div>
              <div className="text-sm font-semibold text-[#1c2b3a]">{adj.employeeName}</div>
              <div className="text-xs text-gray-400">{fmt(adj.baseSalary)} XAF/mois</div>
            </div>
          </div>
        </td>

        {/* Absences */}
        <td className="px-4 py-3 text-center">
          {adj.hasAttendanceData ? (
            <div>
              <div className="text-sm font-medium text-gray-700">{adj.absentDays}j</div>
              {adj.justifiedDays > 0 && <div className="text-[10px] text-emerald-600">{adj.justifiedDays}j justifiés</div>}
              {adj.unjustifiedAbsentDays > 0 && <div className="text-[10px] text-red-500">-{fmt(adj.absenceDeduction)} XAF</div>}
            </div>
          ) : <span className="text-xs text-gray-300 italic">—</span>}
        </td>

        {/* Congés SS */}
        <td className="px-4 py-3 text-center">
          {adj.unpaidLeaveDays > 0 ? (
            <div>
              <div className="text-sm font-medium text-gray-700">{adj.unpaidLeaveDays}j</div>
              <div className="text-[10px] text-red-500">-{fmt(adj.unpaidLeaveDeduction)} XAF</div>
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </td>

        {/* Points */}
        <td className="px-4 py-3 text-center">
          <div className="text-sm font-medium text-gray-700">{adj.points} pts</div>
          <div className={`text-[10px] font-semibold ${adj.pointsFactor > 0 ? 'text-emerald-600' : adj.pointsFactor < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {pct(adj.pointsFactor)}
          </div>
          {adj.pointsAdjustment !== 0 && (
            <div className={`text-[10px] ${adj.pointsAdjustment > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {adj.pointsAdjustment > 0 ? '+' : ''}{fmt(adj.pointsAdjustment)}
            </div>
          )}
        </td>

        {/* Auto Retenus */}
        <td className="px-4 py-3 text-center">
          {adj.totalDeduction > 0
            ? <span className="text-sm font-semibold text-red-500">-{fmt(adj.totalDeduction)}</span>
            : <span className="text-gray-300">—</span>}
        </td>

        {/* Auto Primes */}
        <td className="px-4 py-3 text-center">
          {adj.totalPrime > 0
            ? <span className="text-sm font-semibold text-emerald-600">+{fmt(adj.totalPrime)}</span>
            : <span className="text-gray-300">—</span>}
        </td>

        {/* Manual summary */}
        <td className="px-4 py-3 text-center">
          {hasManual ? (
            <div className="space-y-0.5">
              {manualPrimesTotal > 0 && <div className="text-[11px] font-semibold text-emerald-600">+{fmt(manualPrimesTotal)}</div>}
              {manualRetenusTotal > 0 && <div className="text-[11px] font-semibold text-red-500">-{fmt(manualRetenusTotal)}</div>}
            </div>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>

        {/* Expand toggle */}
        <td className="px-3 py-3 text-center">
          <button
            onClick={() => setExpanded(v => !v)}
            className={`p-1.5 transition-colors ${expanded ? 'text-[#33cbcc] bg-[#33cbcc]/10' : 'text-gray-400 hover:text-[#33cbcc] hover:bg-gray-100'}`}
            title="Ajustements manuels"
          >
            {expanded ? <ArrowUp01Icon size={14} /> : <Add01Icon size={14} />}
          </button>
        </td>
      </tr>

      {/* Expanded manual editor */}
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-6 max-w-2xl">
              {/* Primes */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">
                  Primes manuelles
                </div>
                <ManualLinesEditor
                  lines={manual.primes}
                  onChange={primes => onManualChange({ ...manual, primes })}
                  accent="text-emerald-600 hover:text-emerald-700"
                  placeholder="Libellé de la prime"
                />
              </div>
              {/* Retenus */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">
                  Retenus manuelles
                </div>
                <ManualLinesEditor
                  lines={manual.retenus}
                  onChange={retenus => onManualChange({ ...manual, retenus })}
                  accent="text-red-500 hover:text-red-600"
                  placeholder="Libellé de la retenue"
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function SalaryCalculation() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [workDays, setWorkDays] = useState(23);
  const [brackets, setBrackets] = useState<PointsBracket[]>(DEFAULT_BRACKETS);
  const [configOpen, setConfigOpen] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [manuals, setManuals] = useState<Record<string, ManualEmployeeAdjustment>>({});

  const { data: preview, isLoading, refetch } = useRhSalaryPreview({ month, year, workDays, brackets });
  const apply = useApplyRhSalary();
  const { data: applied } = useAppliedComponents(month, year);

  const alreadyApplied = Array.isArray(applied) && applied.length > 0;

  const getManual = (empId: string): ManualEmployeeAdjustment =>
    manuals[empId] ?? { employeeId: empId, primes: [], retenus: [] };

  const setManual = (empId: string, m: ManualEmployeeAdjustment) =>
    setManuals(prev => ({ ...prev, [empId]: m }));

  const handleApply = useCallback(async () => {
    if (!preview) return;
    const manualAdjustments = Object.values(manuals).filter(
      m => m.primes.some(p => p.amount > 0 && p.label.trim()) ||
           m.retenus.some(r => r.amount > 0 && r.label.trim()),
    );
    const hasAuto = preview.employees.some(
      e => e.absenceDeduction > 0 || e.unpaidLeaveDeduction > 0 || e.pointsAdjustment !== 0,
    );
    if (!hasAuto && manualAdjustments.length === 0) {
      toast.info('Aucun ajustement à appliquer pour ce mois.');
      return;
    }
    try {
      const result = await apply.mutateAsync({
        month, year, workDaysPerMonth: workDays, brackets, manualAdjustments,
      });
      setJustApplied(true);
      toast.success(`${result.applied} composante(s) créées avec succès`);
    } catch {
      toast.error('Erreur lors de l\'application des ajustements');
    }
  }, [preview, month, year, workDays, brackets, manuals, apply]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const selectCls = 'bg-white border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors cursor-pointer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#33cbcc] mb-1">Ressources Humaines</p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1c2b3a] leading-tight">Calcul de salaire</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ajustements selon présences, congés sans solde, points de performance et primes/retenus manuelles.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Actualiser
          </button>
          <button
            onClick={handleApply}
            disabled={apply.isPending || isLoading || !preview}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#33cbcc] hover:bg-[#2bb5b6] text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {apply.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <CheckmarkCircle01Icon size={16} />}
            {alreadyApplied ? 'Ré-appliquer' : 'Appliquer'}
          </button>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Mois</label>
            <select value={month} onChange={e => { setMonth(+e.target.value); setJustApplied(false); }} className={selectCls}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Année</label>
            <select value={year} onChange={e => { setYear(+e.target.value); setJustApplied(false); }} className={selectCls}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Jours ouvrés</label>
            <input type="number" min={15} max={31} value={workDays} onChange={e => setWorkDays(+e.target.value)}
              className="bg-white border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors w-20" />
          </div>
        </div>

        {/* Config toggle */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button onClick={() => setConfigOpen(o => !o)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <Settings01Icon size={14} />
            Paliers de performance (points)
            {configOpen ? <ArrowUp01Icon size={14} /> : <ArrowDown01Icon size={14} />}
          </button>
          {configOpen && (
            <div className="mt-3 p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 mb-3">Le facteur (%) est appliqué sur le salaire de base.</p>
              <BracketEditor brackets={brackets} onChange={setBrackets} />
              <button onClick={() => setBrackets(DEFAULT_BRACKETS)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors underline">
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Banners */}
      {justApplied && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckmarkCircle01Icon size={18} className="text-emerald-500 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-800">Ajustements appliqués</div>
              <div className="text-xs text-emerald-600">Les composantes salariales ont été créées et sont prises en compte dans la fiche de paie.</div>
            </div>
          </div>
          <button onClick={() => navigate('/accounting/payroll')} className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors whitespace-nowrap ml-4">
            Voir la paie <ArrowRight01Icon size={14} />
          </button>
        </div>
      )}

      {alreadyApplied && !justApplied && (
        <div className="bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
          <Alert02Icon size={16} className="text-blue-400 shrink-0" />
          <p className="text-xs text-blue-700">
            Des ajustements ont déjà été appliqués pour {MONTH_NAMES[month - 1]} {year}. Cliquer sur «&nbsp;Ré-appliquer&nbsp;» supprimera les précédents et en créera de nouveaux.
          </p>
        </div>
      )}

      {preview && !preview.hasAttendanceData && (
        <div className="bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
          <Alert02Icon size={16} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Aucun fichier de présence importé pour {MONTH_NAMES[month - 1]} {year}. Les absences ne seront pas déduites.
          </p>
        </div>
      )}

      {/* Totals + Table */}
      <div className="bg-white border border-gray-200">
        {preview && (
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-6 py-4 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Total retenus</div>
              <div className={`text-lg font-bold ${preview.totals.totalDeductions > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                {preview.totals.totalDeductions > 0 ? `-${fmt(preview.totals.totalDeductions)} XAF` : '—'}
              </div>
            </div>
            <div className="px-6 py-4 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Total primes</div>
              <div className={`text-lg font-bold ${preview.totals.totalPrimes > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                {preview.totals.totalPrimes > 0 ? `+${fmt(preview.totals.totalPrimes)} XAF` : '—'}
              </div>
            </div>
            <div className="px-6 py-4 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Impact net auto</div>
              <div className={`text-lg font-bold ${preview.totals.netImpact > 0 ? 'text-emerald-600' : preview.totals.netImpact < 0 ? 'text-red-500' : 'text-gray-300'}`}>
                {preview.totals.netImpact !== 0
                  ? `${preview.totals.netImpact > 0 ? '+' : ''}${fmt(preview.totals.netImpact)} XAF`
                  : '—'}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loading02Icon size={20} className="animate-spin text-[#33cbcc]" />
            Calcul en cours…
          </div>
        ) : !preview || preview.employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserGroupIcon size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Aucun employé avec un salaire configuré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Employé', 'Absences', 'Congé SS', 'Points', 'Retenus auto', 'Primes auto', 'Manuels', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center ${i === 0 ? 'text-left' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.employees.map(adj => (
                  <EmployeeRow
                    key={adj.employeeId}
                    adj={adj}
                    manual={getManual(adj.employeeId)}
                    onManualChange={m => setManual(adj.employeeId, m)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      {preview && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Money01Icon size={12} className="text-red-400" />
            <span>Retenus auto = absences injustifiées + congés SS + malus points</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Money01Icon size={12} className="text-emerald-500" />
            <span>Primes auto = bonus performance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Cliquez <strong>+</strong> sur une ligne pour saisir des primes/retenus manuelles</span>
          </div>
        </div>
      )}
    </div>
  );
}

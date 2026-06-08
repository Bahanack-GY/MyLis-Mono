import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock01Icon, Add01Icon, Tick01Icon, CancelCircleIcon, Cancel01Icon, Loading02Icon, Calendar01Icon, Download01Icon } from 'hugeicons-react';
import { useMyPermissions, useCreatePermission } from '../../api/permissions/hooks';
import type { PermissionStatus, CreatePermissionDto, PermissionRequest } from '../../api/permissions/types';
import { useAuth } from '../../contexts/AuthContext';
import { exportPermissionAbsencePdf } from '../../utils/exportAbsencePdf';

const STATUS_BG: Record<PermissionStatus, string> = {
  PENDING: 'bg-[#283852]/10 text-[#283852]/70',
  APPROVED: 'bg-[#33cbcc]/10 text-[#33cbcc]',
  REJECTED: 'bg-gray-100 text-gray-400',
};

const STATUS_ICON: Record<PermissionStatus, typeof Clock01Icon> = {
  PENDING: Clock01Icon,
  APPROVED: Tick01Icon,
  REJECTED: CancelCircleIcon,
};

const STATUS_LABEL: Record<PermissionStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/* ─── Create Modal ─────────────────────────────────────────── */
const CreatePermissionModal = ({ onClose }: { onClose: () => void }) => {
  const createPermission = useCreatePermission();
  const [form, setForm] = useState<CreatePermissionDto>({
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
  });
  const [error, setError] = useState('');

  const canSubmit = form.date && form.startTime && form.endTime && form.reason.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (form.endTime <= form.startTime) {
      setError("L'heure de retour doit être après l'heure de départ.");
      return;
    }
    setError('');
    try {
      await createPermission.mutateAsync(form);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Erreur lors de la soumission.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[#283852]">Demande d'autorisation de sortie</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Cancel01Icon size={20} /></button>
        </div>

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#283852]/20"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Heure de départ</label>
              <input
                type="time"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#283852]/20"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Heure de retour</label>
              <input
                type="time"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#283852]/20"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Motif</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#283852]/20"
              placeholder="Raison de votre demande d'autorisation..."
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || createPermission.isPending}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-[#283852] text-white hover:bg-[#283852]/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createPermission.isPending && <Loading02Icon size={14} className="animate-spin" />}
            Soumettre
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── PDF download helper ───────────────────────────────────── */
const downloadPermissionPdf = (req: PermissionRequest, myName: string) => {
  const approverEmp = req.approvedBy?.employee;
  const approverName = approverEmp
    ? `${approverEmp.firstName} ${approverEmp.lastName}`
    : req.approvedBy?.email ?? 'RH';
  exportPermissionAbsencePdf({
    employeeName: myName,
    date: req.date,
    startTime: req.startTime,
    endTime: req.endTime,
    durationHours: req.durationHours,
    reason: req.reason,
    approvedByName: approverName,
    approvedAt: req.approvedAt,
    requestedAt: req.createdAt,
  });
};

/* ─── Main Page ─────────────────────────────────────────────── */
export default function EmployeePermissions() {
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();
  const myName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : '';
  const { data: requests = [], isLoading } = useMyPermissions();

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#283852]">Mes autorisations</h1>
          <p className="text-sm text-gray-500 mt-1">Demandes d'autorisation de sortie anticipée</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#283852] text-white text-sm font-medium rounded-xl hover:bg-[#283852]/90 transition-colors"
        >
          <Add01Icon size={16} />
          Nouvelle demande
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loading02Icon size={24} className="animate-spin text-[#283852]/40" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar01Icon size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune demande d'autorisation</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 text-sm bg-[#283852] text-white rounded-xl hover:bg-[#283852]/90"
            >
              Faire une demande
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Horaire</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Durée</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Motif</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Statut</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const StatusIcon = STATUS_ICON[req.status];
                return (
                  <tr key={req.id} className="border-b border-gray-50">
                    <td className="px-5 py-3.5 text-sm text-gray-700">{formatDate(req.date)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{req.startTime} – {req.endTime}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#283852]">{req.durationHours}h</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 max-w-50 truncate">{req.reason}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BG[req.status]}`}>
                        <StatusIcon size={11} />
                        {STATUS_LABEL[req.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {req.status === 'APPROVED' && (
                        <button
                          onClick={() => downloadPermissionPdf(req, myName)}
                          title="Télécharger la permission PDF"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#33cbcc] border border-[#33cbcc]/30 hover:bg-[#33cbcc]/10 transition-colors"
                        >
                          <Download01Icon size={13} />
                          PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Rejection reasons */}
      {requests.some(r => r.status === 'REJECTED' && r.rejectionReason) && (
        <div className="mt-4 space-y-2">
          {requests.filter(r => r.status === 'REJECTED' && r.rejectionReason).map(r => (
            <div key={r.id} className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs text-red-400 mb-0.5">Motif de refus — {formatDate(r.date)}</p>
              <p className="text-sm text-red-600">{r.rejectionReason}</p>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreatePermissionModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

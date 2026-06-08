import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock01Icon, Tick01Icon, CancelCircleIcon, Cancel01Icon, Search01Icon, UserIcon, Loading02Icon, Calendar01Icon } from 'hugeicons-react';
import { usePermissions, useApprovePermission, useRejectPermission } from '../../api/permissions/hooks';
import type { PermissionRequest, PermissionStatus } from '../../api/permissions/types';

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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/* ─── Reject Modal ─────────────────────────────────────────── */
const RejectModal = ({ onConfirm, onClose, loading }: { onConfirm: (r: string) => void; onClose: () => void; loading: boolean }) => {
  const [reason, setReason] = useState('');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-[#283852] mb-4">Motif de refus</h3>
        <textarea
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#283852]/20"
          placeholder="Expliquez la raison du refus..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="flex-1 px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loading02Icon size={14} className="animate-spin" />}
            Refuser
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Detail Modal ──────────────────────────────────────────── */
const DetailModal = ({ request, onClose }: { request: PermissionRequest; onClose: () => void }) => {
  const approve = useApprovePermission();
  const reject = useRejectPermission();
  const [showReject, setShowReject] = useState(false);

  const isPending = request.status === 'PENDING';
  const employeeName = request.employee
    ? `${request.employee.firstName} ${request.employee.lastName}`
    : '—';

  const handleApprove = async () => {
    await approve.mutateAsync(request.id);
    onClose();
  };

  const handleReject = async (reason: string) => {
    await reject.mutateAsync({ id: request.id, reason });
    onClose();
  };

  const StatusIcon = STATUS_ICON[request.status];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-[#283852]">Demande d'autorisation</h3>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BG[request.status]}`}>
                <StatusIcon size={12} />
                {request.status === 'PENDING' ? 'En attente' : request.status === 'APPROVED' ? 'Approuvée' : 'Refusée'}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Cancel01Icon size={20} /></button>
          </div>

          {/* Employee */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center">
              {request.employee?.avatarUrl
                ? <img src={request.employee.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="" />
                : <UserIcon size={16} className="text-[#283852]" />}
            </div>
            <p className="text-sm font-medium text-[#283852]">{employeeName}</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-sm font-medium text-[#283852]">{formatDate(request.date)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Durée</p>
              <p className="text-sm font-medium text-[#283852]">{request.durationHours}h</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Heure de départ</p>
              <p className="text-sm font-medium text-[#283852]">{request.startTime}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Heure de retour</p>
              <p className="text-sm font-medium text-[#283852]">{request.endTime}</p>
            </div>
          </div>

          {request.reason && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-0.5">Motif</p>
              <p className="text-sm text-[#283852]">{request.reason}</p>
            </div>
          )}

          {request.rejectionReason && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-red-400 mb-0.5">Motif de refus</p>
              <p className="text-sm text-red-600">{request.rejectionReason}</p>
            </div>
          )}

          {isPending && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowReject(true)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={handleApprove}
                disabled={approve.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#33cbcc] text-white text-sm hover:bg-[#33cbcc]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approve.isPending && <Loading02Icon size={14} className="animate-spin" />}
                Approuver
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showReject && (
          <RejectModal
            onConfirm={handleReject}
            onClose={() => setShowReject(false)}
            loading={reject.isPending}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* ─── Main Page ─────────────────────────────────────────────── */
type FilterStatus = 'ALL' | PermissionStatus;

export default function AdminPermissions() {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PermissionRequest | null>(null);

  const { data: requests = [], isLoading } = usePermissions(
    filter !== 'ALL' ? { status: filter } : undefined
  );

  const filtered = requests.filter(r => {
    if (!search.trim()) return true;
    const name = r.employee ? `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase() : '';
    return name.includes(search.toLowerCase());
  });

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'ALL', label: 'Toutes' },
    { key: 'PENDING', label: 'En attente' },
    { key: 'APPROVED', label: 'Approuvées' },
    { key: 'REJECTED', label: 'Refusées' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#283852]">Autorisations d'absence</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez les demandes d'autorisation de sortie des employés</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#283852] text-white'
                  : 'text-gray-500 hover:text-[#283852]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 shadow-sm flex-1 max-w-xs">
          <Search01Icon size={16} className="text-gray-400" />
          <input
            className="flex-1 py-2 text-sm bg-transparent outline-none text-[#283852] placeholder:text-gray-300"
            placeholder="Rechercher un employé..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loading02Icon size={24} className="animate-spin text-[#283852]/40" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar01Icon size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune demande d'autorisation</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Employé</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Horaire</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Durée</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => {
                const StatusIcon = STATUS_ICON[req.status];
                const name = req.employee
                  ? `${req.employee.firstName} ${req.employee.lastName}`
                  : '—';
                return (
                  <tr
                    key={req.id}
                    onClick={() => setSelected(req)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#283852]/10 flex items-center justify-center shrink-0">
                          {req.employee?.avatarUrl
                            ? <img src={req.employee.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                            : <UserIcon size={14} className="text-[#283852]" />}
                        </div>
                        <span className="text-sm font-medium text-[#283852]">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(req.date)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{req.startTime} – {req.endTime}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#283852]">{req.durationHours}h</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BG[req.status]}`}>
                        <StatusIcon size={11} />
                        {req.status === 'PENDING' ? 'En attente' : req.status === 'APPROVED' ? 'Approuvée' : 'Refusée'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {selected && <DetailModal request={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

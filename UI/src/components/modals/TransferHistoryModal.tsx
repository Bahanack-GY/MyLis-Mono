import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, Clock01Icon, ArrowRight01Icon, Building02Icon, UserIcon, File01Icon } from 'hugeicons-react';
import { useTranslation } from 'react-i18next';
import { useEmployeeTransferHistory } from '../../api/employees/hooks';
import { format } from 'date-fns';

interface TransferHistoryModalProps {
  employeeId: string;
  onClose: () => void;
}

const TransferHistoryModal = ({ employeeId, onClose }: TransferHistoryModalProps) => {
  const { t } = useTranslation();
  const { data: history = [], isLoading } = useEmployeeTransferHistory(employeeId);

  return (
  <AnimatePresence>
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={(e) => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
  {t('employees.transfer.subtitle', 'Employee')}
  </p>
  <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">
  {t('employees.transfer.historyTitle')}
  </h2>
  </div>
  <button
  onClick={onClose}
  className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors"
  >
  <Cancel01Icon size={20} />
  </button>
  </div>

  {/* Content */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
  {isLoading ? (
  <div className="text-center py-12">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33cbcc] mx-auto" />
  </div>
  ) : history.length === 0 ? (
  <div className="text-center py-12">
  <Building02Icon className="w-16 h-16 text-[#8892a4] mx-auto mb-4" />
  <p className="text-[#8892a4]">{t('employees.transfer.noHistory')}</p>
  </div>
  ) : (
  <div className="space-y-4">
  {history.map((entry, index) => (
  <div key={entry.id} className="relative">
  {/* Timeline connector */}
  {index < history.length - 1 && (
  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-[#e5e8ef]" />
  )}

  <div className="flex gap-4">
  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
  <ArrowRight01Icon className="w-5 h-5 text-[#33cbcc]" />
  </div>

  <div className="flex-1 bg-[#f8f9fc] p-4">
  {/* Transfer info */}
  <div className="flex items-center gap-2 mb-3">
  <span className="text-sm text-[#8892a4]">
  {entry.fromDepartment?.name || t('employees.transfer.noDepartment')}
  </span>
  <ArrowRight01Icon className="w-4 h-4 text-[#8892a4]" />
  <span className="text-sm font-semibold text-[#1c2b3a]">
  {entry.toDepartment.name}
  </span>
  </div>

  {/* Metadata */}
  <div className="space-y-1 text-sm text-[#8892a4]">
  <div className="flex items-center gap-2">
  <UserIcon className="w-4 h-4" />
  <span>{t('employees.transfer.transferredBy')} {entry.transferredByName}</span>
  </div>
  <div className="flex items-center gap-2">
  <Clock01Icon className="w-4 h-4" />
  <span>{format(new Date(entry.createdAt), 'PPp')}</span>
  </div>
  {entry.reason && (
  <div className="flex items-start gap-2 mt-2">
  <File01Icon className="w-4 h-4 mt-0.5" />
  <span className="text-[#1c2b3a]">{entry.reason}</span>
  </div>
  )}
  </div>
  </div>
  </div>
  </div>
  ))}
  </div>
  )}
  </div>
  </motion.div>
  </motion.div>
  </AnimatePresence>
  );
};

export default TransferHistoryModal;

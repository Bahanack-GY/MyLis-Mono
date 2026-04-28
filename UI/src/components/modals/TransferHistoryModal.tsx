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
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {t('employees.transfer.historyTitle')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <Cancel01Icon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[calc(80vh-88px)] p-6">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33cbcc] mx-auto" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12">
                                <Building02Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">{t('employees.transfer.noHistory')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {history.map((entry, index) => (
                                    <div key={entry.id} className="relative">
                                        {/* Timeline connector */}
                                        {index < history.length - 1 && (
                                            <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                                        )}

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                                                <ArrowRight01Icon className="w-5 h-5 text-[#33cbcc]" />
                                            </div>

                                            <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                                {/* Transfer info */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-sm text-gray-600">
                                                        {entry.fromDepartment?.name || t('employees.transfer.noDepartment')}
                                                    </span>
                                                    <ArrowRight01Icon className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {entry.toDepartment.name}
                                                    </span>
                                                </div>

                                                {/* Metadata */}
                                                <div className="space-y-1 text-sm text-gray-600">
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
                                                            <span className="text-gray-700">{entry.reason}</span>
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

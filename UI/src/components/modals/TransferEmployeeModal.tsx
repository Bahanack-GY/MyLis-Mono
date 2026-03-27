import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowRight, Building2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import { useTransferEmployee } from '../../api/employees/hooks';
import { useDepartments } from '../../api/departments/hooks';
import type { Employee } from '../../api/employees/types';

interface TransferEmployeeModalProps {
    open: boolean;
    onClose: () => void;
    employee: Employee;
}

const TransferEmployeeModal = ({ open, onClose, employee }: TransferEmployeeModalProps) => {
    const { t } = useTranslation();
    const [toDepartmentId, setToDepartmentId] = useState('');
    const [reason, setReason] = useState('');

    const { data: departments = [] } = useDepartments();
    const transferMutation = useTransferEmployee();

    const currentDepartment = employee.department;
    const availableDepartments = departments.filter(d => d.id !== employee.departmentId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await transferMutation.mutateAsync({
            id: employee.id,
            dto: { toDepartmentId, reason: reason.trim() || undefined },
        });
        onClose();
        setToDepartmentId('');
        setReason('');
    };

    const handleClose = () => {
        onClose();
        setToDepartmentId('');
        setReason('');
    };

    return (
        <Modal open={open} onClose={handleClose} labelId="transfer-modal-title" className="max-w-lg">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 id="transfer-modal-title" className="text-2xl font-bold text-gray-900">
                        {t('employees.transfer.title')}
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Employee Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">{t('employees.transfer.employee')}</p>
                        <p className="font-semibold text-gray-900">
                            {employee.firstName} {employee.lastName}
                        </p>
                    </div>

                    {/* Current Department */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('employees.transfer.currentDepartment')}
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            <span className="text-blue-900 font-medium">
                                {currentDepartment?.name || t('employees.transfer.noDepartment')}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                    </div>

                    {/* Target Department */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('employees.transfer.newDepartment')} *
                        </label>
                        <select
                            value={toDepartmentId}
                            onChange={(e) => setToDepartmentId(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('employees.transfer.selectDepartment')}</option>
                            {availableDepartments.map(dept => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Warning for department heads */}
                    {employee.department?.headId === employee.id && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-semibold mb-1">{t('employees.transfer.headWarning')}</p>
                                <p>{t('employees.transfer.headWarningDesc')}</p>
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('employees.transfer.reason')} ({t('common.optional')})
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('employees.transfer.reasonPlaceholder')}
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!toDepartmentId || transferMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {transferMutation.isPending ? t('common.transferring') : t('employees.transfer.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default TransferEmployeeModal;

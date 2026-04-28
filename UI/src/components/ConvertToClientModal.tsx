import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Cancel01Icon, Tick01Icon } from 'hugeicons-react';
import { useConvertLead } from '../api/commercial/hooks';
import { useDepartments } from '../api/departments/hooks';
import type { Lead } from '../api/commercial/types';

const ConvertToClientModal = ({
    lead,
    onClose,
}: {
    lead: Lead;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const convertLead = useConvertLead();
    const { data: departments } = useDepartments();

    const [form, setForm] = useState({
        name: lead.company || '',
        projectDescription: lead.clientNeeds || '',
        type: 'one_time' as 'one_time' | 'subscription',
        price: '',
        departmentId: '',
        srs: '',
        contract: '',
    });

    const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = () => {
        convertLead.mutate(
            {
                id: lead.id,
                data: {
                    name: form.name || undefined,
                    projectDescription: form.projectDescription || undefined,
                    type: form.type,
                    price: form.price || undefined,
                    departmentId: form.departmentId || undefined,
                    srs: form.srs || undefined,
                    contract: form.contract || undefined,
                },
            },
            { onSuccess: () => onClose() },
        );
    };

    const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all';
    const labelCls = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{t('commercial.convert.title', 'Convert to Client')}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {lead.code} — {lead.company}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    <p className="text-sm text-gray-500 bg-[#33cbcc]/10 border border-gray-200 rounded-xl p-3">
                        {t('commercial.convert.description', 'This lead will be marked as WON and converted to a client. Please fill in any additional client information.')}
                    </p>

                    <div>
                        <label className={labelCls}>{t('commercial.convert.clientName', 'Client Name')}</label>
                        <input value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} />
                    </div>

                    <div>
                        <label className={labelCls}>{t('commercial.convert.projectDescription', 'Project Description')}</label>
                        <textarea
                            value={form.projectDescription}
                            onChange={e => update('projectDescription', e.target.value)}
                            rows={2}
                            className={inputCls + ' resize-none'}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>{t('commercial.convert.clientType', 'Client Type')}</label>
                            <select value={form.type} onChange={e => update('type', e.target.value)} className={inputCls + ' appearance-none cursor-pointer'}>
                                <option value="one_time">{t('commercial.convert.oneTime', 'One-time')}</option>
                                <option value="subscription">{t('commercial.convert.subscription', 'Subscription')}</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>{t('commercial.convert.price', 'Price')}</label>
                            <input value={form.price} onChange={e => update('price', e.target.value)} placeholder="e.g. 500 000 FCFA" className={inputCls} />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>{t('commercial.convert.department', 'Department')}</label>
                        <select value={form.departmentId} onChange={e => update('departmentId', e.target.value)} className={inputCls + ' appearance-none cursor-pointer'}>
                            <option value="">{t('commercial.convert.noDepartment', 'No department')}</option>
                            {(departments || []).map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>{t('commercial.convert.srs', 'SRS Document')}</label>
                            <input value={form.srs} onChange={e => update('srs', e.target.value)} placeholder={t('commercial.convert.srsPlaceholder', 'Link or reference')} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>{t('commercial.convert.contract', 'Contract')}</label>
                            <input value={form.contract} onChange={e => update('contract', e.target.value)} placeholder={t('commercial.convert.contractPlaceholder', 'Link or reference')} className={inputCls} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        {t('commercial.pipeline.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!form.name.trim() || convertLead.isPending}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                    >
                        <Tick01Icon size={14} />
                        {convertLead.isPending
                            ? t('commercial.convert.converting', 'Converting...')
                            : t('commercial.convert.confirm', 'Convert & Save')
                        }
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ConvertToClientModal;

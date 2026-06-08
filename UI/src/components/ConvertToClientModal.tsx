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

  const inputCls = 'w-full px-4 py-3 bg-[#f8f9fc] border border-[#e5e8ef] text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
  const labelCls = 'block text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';

  return (
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  onClick={onClose}
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
  {lead.code} — {lead.company}
  </p>
  <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">
  {t('commercial.convert.title', 'Convert to Client')}
  </h2>
  </div>
  <button onClick={onClose} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} />
  </button>
  </div>

  {/* Form */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
  <p className="text-sm text-[#8892a4] bg-[#33cbcc]/10 border border-[#e5e8ef] p-3">
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
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('commercial.pipeline.cancel')}
  </button>
  <button
  onClick={handleSubmit}
  disabled={!form.name.trim() || convertLead.isPending}
  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
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

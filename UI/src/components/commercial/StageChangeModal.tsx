import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight01Icon, Alert02Icon, Cancel01Icon, Tick01Icon } from 'hugeicons-react';
import type { SaleStage } from '../../api/commercial/types';

/* ── Stage metadata ────────────────────────────────────────── */

export const STAGE_ORDER: Record<SaleStage, number> = {
  QUALIFICATION: 0,
  IDENTIFICATION_BESOIN: 1,
  PROPOSITION: 2,
  NEGOCIATION: 3,
  CLOSING: 4,
  GAGNE: 5,
  PERDU: 99, // reachable from any non-locked stage
};

export const STAGE_COLORS: Record<SaleStage, { bg: string; text: string; border: string }> = {
  QUALIFICATION:   { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-[#e5e8ef]' },
  IDENTIFICATION_BESOIN:{ bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-[#e5e8ef]' },
  PROPOSITION:   { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-[#e5e8ef]' },
  NEGOCIATION:   { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', border: 'border-[#e5e8ef]' },
  CLOSING:   { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', border: 'border-[#e5e8ef]' },
  GAGNE:   { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', border: 'border-[#e5e8ef]' },
  PERDU:   { bg: 'bg-[#f8f9fc]',   text: 'text-[#8892a4]', border: 'border-[#e5e8ef]' },
};

/**
 * Returns true if moving from → to is allowed (forward-only, PERDU always ok).
 */
export function isForwardMove(from: SaleStage, to: SaleStage): boolean {
  if (from === 'GAGNE' || from === 'PERDU') return false; // locked
  if (to === 'PERDU') return true;   // lost is always reachable
  return STAGE_ORDER[to] === STAGE_ORDER[from] + 1;
}

/* ── Component ─────────────────────────────────────────────── */

interface Props {
  from: SaleStage;
  to: SaleStage;
  companyName: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StageChangeModal({ from, to, companyName, isPending, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const allowed = isForwardMove(from, to);
  const fromColors = STAGE_COLORS[from];
  const toColors = STAGE_COLORS[to];
  const isLost = to === 'PERDU';
  const isWon = to === 'GAGNE';

  return (
  <AnimatePresence>
  {/* Backdrop */}
  <motion.div
  key="backdrop"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onCancel}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  {/* Panel */}
  <motion.div
  key="panel"
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header stripe */}
  <div className={`h-1.5 shrink-0 ${isLost ? 'bg-[#283852]' : isWon ? 'bg-[#33cbcc]' : 'bg-[#33cbcc]'}`} />

  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
  {t('commercial.stageModal.subtitle', 'Pipeline')}
  </p>
  <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">
  {allowed
  ? t('commercial.stageModal.title', 'Changer le stade')
  : t('commercial.stageModal.blockedTitle', 'Changement impossible')}
  </h2>
  <p className="text-xs text-[#8892a4] mt-0.5">{companyName}</p>
  </div>
  <button onClick={onCancel} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} />
  </button>
  </div>

  {/* Body */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
  {/* Stage transition visual */}
  <div className="flex items-center gap-3">
  <div className={`flex-1 text-center px-3 py-2.5 border text-xs font-semibold ${fromColors.bg} ${fromColors.text} ${fromColors.border}`}>
  {t(`commercial.pipeline.stages.${from}`)}
  </div>
  <ArrowRight01Icon size={18} className={allowed ? 'text-[#8892a4] shrink-0' : 'text-[#b0bac9] shrink-0'} />
  <div className={`flex-1 text-center px-3 py-2.5 border text-xs font-semibold ${toColors.bg} ${toColors.text} ${toColors.border} ${!allowed ? 'opacity-40' : ''}`}>
  {t(`commercial.pipeline.stages.${to}`)}
  </div>
  </div>

  {/* Message */}
  {!allowed ? (
  <div className="flex items-start gap-2.5 bg-[#283852]/10 border border-[#e5e8ef] p-3">
  <Alert02Icon size={16} className="text-[#283852] shrink-0 mt-0.5" />
  <p className="text-xs text-[#283852]">
  {from === 'GAGNE' || from === 'PERDU'
  ? t('commercial.stageModal.lockedMsg', 'Ce lead est verrouillé et ne peut plus être modifié.')
  : STAGE_ORDER[to] < STAGE_ORDER[from]
  ? t('commercial.stageModal.backwardMsg', 'Il n\'est pas possible de revenir à un stade précédent.')
  : t('commercial.stageModal.skipMsg', 'Vous ne pouvez avancer que d\'un stade à la fois.')}
  </p>
  </div>
  ) : isLost ? (
  <div className="flex items-start gap-2.5 bg-[#283852]/10 border border-[#e5e8ef] p-3">
  <Alert02Icon size={16} className="text-[#283852] shrink-0 mt-0.5" />
  <p className="text-xs text-[#283852]">
  {t('commercial.stageModal.lostWarning', 'Vous êtes sur le point de marquer ce lead comme perdu. Cette action peut être irréversible.')}
  </p>
  </div>
  ) : isWon ? (
  <div className="flex items-start gap-2.5 bg-[#33cbcc]/10 border border-[#e5e8ef] p-3">
  <Tick01Icon size={16} className="text-[#33cbcc] shrink-0 mt-0.5" />
  <p className="text-xs text-[#33cbcc]">
  {t('commercial.stageModal.wonInfo', 'Le lead sera converti en client. Une fois gagné, le stade sera verrouillé.')}
  </p>
  </div>
  ) : (
  <p className="text-sm text-[#8892a4]">
  {t('commercial.stageModal.confirmMsg', 'Confirmez-vous le passage au stade suivant ?')}
  </p>
  )}
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onCancel}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('common.cancel', 'Annuler')}
  </button>
  {allowed && (
  <button
  onClick={onConfirm}
  disabled={isPending}
  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${
  isLost
  ? 'bg-[#283852] hover:bg-[#283852]/90'
  : isWon
  ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
  : 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
  } disabled:opacity-50`}
  >
  {isPending ? '...' : t('common.confirm', 'Confirmer')}
  </button>
  )}
  </div>
  </motion.div>
  </motion.div>
  </AnimatePresence>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import type { SaleStage } from '../../api/commercial/types';

/* ── Stage metadata ────────────────────────────────────────── */

export const STAGE_ORDER: Record<SaleStage, number> = {
    PROSPECTION: 0,
    QUALIFICATION: 1,
    PROPOSITION: 2,
    NEGOCIATION: 3,
    CLOSING: 4,
    GAGNE: 5,
    PERDU: 99, // reachable from any non-locked stage
};

export const STAGE_COLORS: Record<SaleStage, { bg: string; text: string; border: string }> = {
    PROSPECTION: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
    QUALIFICATION: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
    PROPOSITION: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
    NEGOCIATION: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
    CLOSING: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', border: 'border-gray-200' },
    GAGNE: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', border: 'border-gray-200' },
    PERDU: { bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-200' },
};

/**
 * Returns true if moving from → to is allowed (forward-only, PERDU always ok).
 */
export function isForwardMove(from: SaleStage, to: SaleStage): boolean {
    if (from === 'GAGNE' || from === 'PERDU') return false; // locked
    if (to === 'PERDU') return true;                        // lost is always reachable
    return STAGE_ORDER[to] > STAGE_ORDER[from];
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
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onCancel}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />

            {/* Modal */}
            <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden"
            >
                {/* Header stripe */}
                <div className={`h-1.5 ${isLost ? 'bg-[#283852]' : isWon ? 'bg-[#33cbcc]' : 'bg-[#33cbcc]'}`} />

                <div className="p-6">
                    {/* Title */}
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                {allowed
                                    ? t('commercial.stageModal.title', 'Changer le stade')
                                    : t('commercial.stageModal.blockedTitle', 'Changement impossible')}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">{companyName}</p>
                        </div>
                        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Stage transition visual */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`flex-1 text-center px-3 py-2.5 rounded-xl border text-xs font-semibold ${fromColors.bg} ${fromColors.text} ${fromColors.border}`}>
                            {t(`commercial.pipeline.stages.${from}`)}
                        </div>
                        <ArrowRight size={18} className={allowed ? 'text-gray-400 shrink-0' : 'text-gray-300 shrink-0'} />
                        <div className={`flex-1 text-center px-3 py-2.5 rounded-xl border text-xs font-semibold ${toColors.bg} ${toColors.text} ${toColors.border} ${!allowed ? 'opacity-40' : ''}`}>
                            {t(`commercial.pipeline.stages.${to}`)}
                        </div>
                    </div>

                    {/* Message */}
                    {!allowed ? (
                        <div className="flex items-start gap-2.5 bg-[#283852]/10 border border-gray-200 rounded-xl p-3 mb-5">
                            <AlertTriangle size={16} className="text-[#283852] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#283852]">
                                {from === 'GAGNE' || from === 'PERDU'
                                    ? t('commercial.stageModal.lockedMsg', 'Ce lead est verrouillé et ne peut plus être modifié.')
                                    : t('commercial.stageModal.backwardMsg', 'Il n\'est pas possible de revenir à un stade précédent.')}
                            </p>
                        </div>
                    ) : isLost ? (
                        <div className="flex items-start gap-2.5 bg-[#283852]/10 border border-gray-200 rounded-xl p-3 mb-5">
                            <AlertTriangle size={16} className="text-[#283852] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#283852]">
                                {t('commercial.stageModal.lostWarning', 'Vous êtes sur le point de marquer ce lead comme perdu. Cette action peut être irréversible.')}
                            </p>
                        </div>
                    ) : isWon ? (
                        <div className="flex items-start gap-2.5 bg-[#33cbcc]/10 border border-gray-200 rounded-xl p-3 mb-5">
                            <CheckCircle2 size={16} className="text-[#33cbcc] shrink-0 mt-0.5" />
                            <p className="text-xs text-[#33cbcc]">
                                {t('commercial.stageModal.wonInfo', 'Le lead sera converti en client. Une fois gagné, le stade sera verrouillé.')}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mb-5">
                            {t('commercial.stageModal.confirmMsg', 'Confirmez-vous le passage au stade suivant ?')}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            {t('common.cancel', 'Annuler')}
                        </button>
                        {allowed && (
                            <button
                                onClick={onConfirm}
                                disabled={isPending}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
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
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

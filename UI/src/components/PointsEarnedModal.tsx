import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PointsEarnedModalProps {
    pointsEarned: number;
    totalPoints: number;
    onClose: () => void;
}

const PointsEarnedModal = ({ pointsEarned, totalPoints, onClose }: PointsEarnedModalProps) => {
    const { t } = useTranslation();

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'tween', duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="bg-white border border-[#e5e8ef] w-full max-w-xs overflow-hidden"
            >
                {/* Teal accent top bar */}
                <div className="h-1 bg-[#33cbcc]" />

                <div className="px-8 py-10 text-center space-y-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#33cbcc]">
                        {t('gamification.pointsEarned.title')}
                    </p>

                    <motion.p
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 20 }}
                        className="text-7xl font-black text-[#1c2b3a] leading-none tracking-tight"
                    >
                        +{pointsEarned}
                    </motion.p>

                    <p className="text-xs text-[#8892a4]">
                        {t('gamification.pointsEarned.total')}
                        {' '}
                        <span className="font-bold text-[#1c2b3a]">{totalPoints}</span>
                        {' '}pts
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors"
                    >
                        {t('gamification.pointsEarned.continue')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PointsEarnedModal;

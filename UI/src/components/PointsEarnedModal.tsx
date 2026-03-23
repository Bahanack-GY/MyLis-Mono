import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';

interface PointsEarnedModalProps {
    pointsEarned: number;
    totalPoints: number;
    onClose: () => void;
}

const PointsEarnedModal = ({ pointsEarned, totalPoints, onClose }: PointsEarnedModalProps) => {
    const { t } = useTranslation();

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center"
            >
                <div className="h-2 bg-gradient-to-r from-[#33cbcc] to-[#283852]" />
                <div className="p-8 space-y-4">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-20 h-20 mx-auto rounded-full bg-[#33cbcc]/10 flex items-center justify-center"
                    >
                        <Zap size={40} className="text-[#33cbcc]" />
                    </motion.div>

                    <h2 className="text-xl font-bold text-gray-800">
                        {t('gamification.pointsEarned.title')}
                    </h2>

                    <motion.p
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="text-5xl font-black text-[#33cbcc]"
                    >
                        +{pointsEarned}
                    </motion.p>
                    <p className="text-sm text-gray-500">
                        {t('gamification.pointsEarned.total')}: {totalPoints} pts
                    </p>

                    <button
                        onClick={onClose}
                        className="mt-4 w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors cursor-pointer"
                    >
                        {t('gamification.pointsEarned.continue')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PointsEarnedModal;

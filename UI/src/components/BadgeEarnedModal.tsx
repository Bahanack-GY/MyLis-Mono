import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';

import badge1 from '../assets/badges/1.jpg';
import badge2 from '../assets/badges/2.jpg';
import badge3 from '../assets/badges/3.jpg';
import badge4 from '../assets/badges/4.jpg';
import badge5 from '../assets/badges/5.jpg';
import badge6 from '../assets/badges/6.jpg';
import badge7 from '../assets/badges/7.jpg';
import badge8 from '../assets/badges/8.jpg';
import badge9 from '../assets/badges/9.jpg';
import badge10 from '../assets/badges/10.jpg';
import badge11 from '../assets/badges/11.jpg';
import badge12 from '../assets/badges/12.jpg';
import badge13 from '../assets/badges/13.jpg';
import badge14 from '../assets/badges/14.jpg';
import badge15 from '../assets/badges/15.jpg';
import badge16 from '../assets/badges/16.jpg';

const BADGE_IMAGES: Record<number, string> = {
    1: badge1, 2: badge2, 3: badge3, 4: badge4,
    5: badge5, 6: badge6, 7: badge7, 8: badge8,
    9: badge9, 10: badge10, 11: badge11, 12: badge12,
    13: badge13, 14: badge14, 15: badge15, 16: badge16,
};

interface BadgeEarnedModalProps {
    badgeNumber: number;
    title: string;
    milestone: number;
    onClose: () => void;
}

const BadgeEarnedModal = ({ badgeNumber, title, milestone, onClose }: BadgeEarnedModalProps) => {
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

    const badgeImage = BADGE_IMAGES[badgeNumber];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center"
            >
                <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
                <div className="p-8 space-y-4">
                    {/* Confetti-like decorative dots */}
                    <div className="relative">
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5], x: Math.cos(i * 45 * Math.PI / 180) * 60, y: Math.sin(i * 45 * Math.PI / 180) * 60 }}
                                transition={{ delay: 0.4 + i * 0.05, duration: 0.8 }}
                                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                                style={{ backgroundColor: ['#33cbcc', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#f43f5e', '#6366f1'][i] }}
                            />
                        ))}
                        <motion.div
                            initial={{ scale: 0, rotate: -360 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.3 }}
                        >
                            {badgeImage ? (
                                <img
                                    src={badgeImage}
                                    alt={title}
                                    className="w-28 h-28 mx-auto rounded-full object-cover border-4 border-amber-200 shadow-lg"
                                />
                            ) : (
                                <div className="w-28 h-28 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                                    <Award size={56} className="text-amber-500" />
                                </div>
                            )}
                        </motion.div>
                    </div>

                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-xl font-bold text-gray-800"
                    >
                        {t('gamification.badgeEarned.title')}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-lg font-semibold text-amber-600"
                    >
                        {title}
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-sm text-gray-500"
                    >
                        {t('gamification.badgeEarned.milestone', { count: milestone })}
                    </motion.p>

                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        onClick={onClose}
                        className="mt-4 w-full px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-colors cursor-pointer"
                    >
                        {t('gamification.badgeEarned.awesome')}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default BadgeEarnedModal;

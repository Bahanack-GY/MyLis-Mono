import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Award01Icon } from 'hugeicons-react';

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
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const badgeImage = BADGE_IMAGES[badgeNumber];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="bg-white border border-[#e5e8ef] w-full max-w-xs overflow-hidden"
            >
                {/* Navy accent top bar */}
                <div className="h-1 bg-[#283852]" />

                <div className="px-8 py-10 text-center space-y-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#283852]">
                        {t('gamification.badgeEarned.title')}
                    </p>

                    {/* Badge image */}
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
                        className="mx-auto"
                    >
                        {badgeImage ? (
                            <img
                                src={badgeImage}
                                alt={title}
                                className="w-24 h-24 mx-auto object-cover border-2 border-[#e5e8ef]"
                            />
                        ) : (
                            <div className="w-24 h-24 mx-auto border-2 border-[#e5e8ef] flex items-center justify-center bg-[#f8f9fc]">
                                <Award01Icon size={44} className="text-[#283852]" />
                            </div>
                        )}
                    </motion.div>

                    <div className="space-y-1">
                        <p className="text-base font-bold text-[#1c2b3a]">{title}</p>
                        <p className="text-xs text-[#8892a4]">
                            {t('gamification.badgeEarned.milestone', { count: milestone })}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors"
                    >
                        {t('gamification.badgeEarned.awesome')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default BadgeEarnedModal;

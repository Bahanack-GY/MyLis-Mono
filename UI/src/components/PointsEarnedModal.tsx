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
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
  onClick={onClose}
  >
  <motion.div
  initial={{ scale: 0.85, opacity: 0, y: 16 }}
  animate={{ scale: 1, opacity: 1, y: 0 }}
  exit={{ scale: 0.85, opacity: 0, y: 16 }}
  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-xs border border-[#e5e8ef] shadow-xl overflow-hidden"
  >
  {/* Accent top */}
  <div className="h-1 bg-[#33cbcc]" />

  {/* Body */}
  <div className="px-8 py-10 flex flex-col items-center text-center gap-3">
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc]">
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
  </div>

  {/* Footer */}
  <div className="px-6 pb-6">
  <button
  onClick={onClose}
  className="w-full py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors"
  >
  {t('gamification.pointsEarned.continue')}
  </button>
  </div>
  </motion.div>
  </motion.div>
  );
};

export default PointsEarnedModal;

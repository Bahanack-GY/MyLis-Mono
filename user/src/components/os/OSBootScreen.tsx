import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OSBootScreenProps {
  onDone: () => void;
}

const BOOT_DURATION = 3500;
const TICK = 50;

export default function OSBootScreen({ onDone }: OSBootScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += TICK;
      const t = Math.min(elapsed / BOOT_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);

      if (t >= 1) {
        clearInterval(interval);
        setFadeOut(true);
        setTimeout(onDone, 600);
      }
    }, TICK);

    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <AnimatePresence>
      {!fadeOut ? (
        <motion.div
          key="boot"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black"
        >
          <motion.img
            src="/Logo.png"
            alt="MyLiS"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-20 h-20 mb-10 object-contain"
            draggable={false}
          />
          <div className="w-56 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white/80"
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="fade"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100000] bg-black"
        />
      )}
    </AnimatePresence>
  );
}

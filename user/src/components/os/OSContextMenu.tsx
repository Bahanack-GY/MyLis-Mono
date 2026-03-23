import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ContextMenuState } from './types';

interface OSContextMenuProps {
  menu: ContextMenuState | null;
  onClose: () => void;
}

export default function OSContextMenu({ menu, onClose }: OSContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handleDown, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleDown, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menu, onClose]);

  let x = menu?.x ?? 0;
  let y = menu?.y ?? 0;
  if (menu) {
    const menuW = 200;
    const menuH = menu.items.length * 36;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 4;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 4;
    if (x < 0) x = 4;
    if (y < 0) y = 4;
  }

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.12 }}
          className="fixed py-1.5 min-w-[180px] bg-[#1a2536]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ left: x, top: y, zIndex: 99999 }}
        >
          {menu.items.map((entry, i) => {
            if (entry.type === 'divider') {
              return <div key={i} className="my-1 border-t border-white/10" />;
            }
            if (entry.type === 'label') {
              return (
                <div key={i} className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {entry.text}
                </div>
              );
            }
            const Icon = entry.icon;
            return (
              <button
                key={i}
                disabled={entry.disabled}
                onClick={() => { entry.onClick(); onClose(); }}
                className={`flex items-center gap-2.5 w-full px-3 h-8 text-left text-[13px] transition-colors
                  ${entry.disabled
                    ? 'text-gray-600 cursor-default'
                    : entry.danger
                      ? 'text-red-400 hover:bg-red-500/15'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
              >
                {entry.checked !== undefined ? (
                  <span className="w-3.5 shrink-0 flex items-center justify-center">
                    {entry.checked && <Check size={12} className="text-[#33cbcc]" />}
                  </span>
                ) : (
                  Icon && <Icon size={14} className="shrink-0 opacity-70" />
                )}
                {entry.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

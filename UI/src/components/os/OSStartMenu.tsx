import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LogOut } from 'lucide-react';
import { appRegistry } from './osAppRegistry';
import OSMacIcon from './OSMacIcon';
import { useAuth } from '../../contexts/AuthContext';
import type { AppDefinition } from './types';

interface OSStartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApp: (app: AppDefinition) => void;
}

export default function OSStartMenu({ isOpen, onClose, onOpenApp }: OSStartMenuProps) {
  const [search, setSearch] = useState('');
  const { user, setToken } = useAuth();

  const filtered = appRegistry.filter(app =>
    app.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (app: AppDefinition) => {
    onOpenApp(app);
    onClose();
    setSearch('');
  };

  const handleLogout = () => {
    setToken(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            style={{ zIndex: 8999 }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute bottom-16 left-2 w-[420px] bg-[#1a2536]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ zIndex: 9001 }}
          >
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 h-9">
                <Search size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search apps..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-4 pb-4 grid grid-cols-4 gap-1 max-h-[320px] overflow-auto">
              {filtered.map(app => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleOpen(app)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <OSMacIcon icon={Icon} gradient={app.gradient} size={44} />
                    <span className="text-[11px] text-gray-300 text-center leading-tight">
                      {app.label}
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-4 py-8 text-center text-gray-500 text-sm">
                  No apps found
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#33cbcc]/20 flex items-center justify-center">
                  <span className="text-xs text-[#33cbcc] font-semibold">
                    {user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs">
                  <div className="text-gray-300">{user?.email}</div>
                  <div className="text-gray-500">{user?.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs text-gray-400 hover:bg-white/10 hover:text-red-400 transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

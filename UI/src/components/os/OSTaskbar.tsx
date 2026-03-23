import { useCallback } from 'react';
import { Monitor, Minimize2, Maximize2, X, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appRegistry } from './osAppRegistry';
import OSMacIcon from './OSMacIcon';
import OSSystemTray from './OSSystemTray';
import type { WindowState, ContextMenuEntry } from './types';

interface OSTaskbarProps {
  windows: WindowState[];
  onStartClick: () => void;
  onWindowClick: (id: string) => void;
  startOpen: boolean;
  onMinimizeWindow: (id: string) => void;
  onMaximizeWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onContextMenu: (x: number, y: number, items: ContextMenuEntry[]) => void;
}

const TASKBAR_HEIGHT = 56;

export default function OSTaskbar({
  windows,
  onStartClick,
  onWindowClick,
  startOpen,
  onMinimizeWindow,
  onMaximizeWindow,
  onCloseWindow,
  onContextMenu,
}: OSTaskbarProps) {
  const navigate = useNavigate();

  const handleWindowContextMenu = useCallback(
    (e: React.MouseEvent, w: WindowState) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e.clientX, e.clientY, [
        {
          type: 'item',
          label: w.isMinimized ? 'Restore' : 'Minimize',
          icon: Minimize2,
          onClick: () => (w.isMinimized ? onWindowClick(w.id) : onMinimizeWindow(w.id)),
        },
        {
          type: 'item',
          label: w.isMaximized ? 'Restore size' : 'Maximize',
          icon: Maximize2,
          onClick: () => onMaximizeWindow(w.id),
        },
        { type: 'divider' },
        {
          type: 'item',
          label: 'Close',
          icon: X,
          danger: true,
          onClick: () => onCloseWindow(w.id),
        },
      ]);
    },
    [onContextMenu, onWindowClick, onMinimizeWindow, onMaximizeWindow, onCloseWindow]
  );

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center px-2 bg-[#0f1923]/95 backdrop-blur-md border-t border-white/5"
      style={{ height: TASKBAR_HEIGHT, zIndex: 9000 }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Start button */}
      <button
        onClick={onStartClick}
        className={`flex items-center gap-2 px-4 h-10 rounded-lg transition-colors ${
          startOpen ? 'bg-[#33cbcc]/20 text-[#33cbcc]' : 'hover:bg-white/10 text-gray-300'
        }`}
      >
        <Monitor size={18} />
        <span className="text-sm font-medium">Start</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Running apps */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {windows.map(w => {
          const app = appRegistry.find(a => a.id === w.appId);
          if (!app) return null;
          return (
            <button
              key={w.id}
              onClick={() => onWindowClick(w.id)}
              onContextMenu={e => handleWindowContextMenu(e, w)}
              className={`flex items-center gap-2 px-3 h-9 rounded-lg text-sm truncate max-w-[180px] transition-colors ${
                w.isMinimized
                  ? 'text-gray-500 hover:bg-white/5'
                  : 'text-gray-200 bg-white/10 hover:bg-white/15'
              }`}
            >
              <OSMacIcon icon={app.icon} gradient={app.gradient} size={24} />
              <span className="truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      {/* Dashboard toggle */}
      <button
        onClick={() => navigate('/dashboard')}
        title="Switch to Dashboard view"
        className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-[#33cbcc] transition-colors border border-white/10 ml-2"
      >
        <LayoutDashboard size={16} />
        <span>Dashboard</span>
      </button>

      {/* System tray */}
      <OSSystemTray />
    </div>
  );
}

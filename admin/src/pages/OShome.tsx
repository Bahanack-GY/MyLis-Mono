import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import OSBootScreen from '../components/os/OSBootScreen';
import OSDesktop from '../components/os/OSDesktop';
import OSWindow from '../components/os/OSWindow';
import OSTaskbar from '../components/os/OSTaskbar';
import OSStartMenu from '../components/os/OSStartMenu';
import OSContextMenu from '../components/os/OSContextMenu';
import { useWindowManager } from '../components/os/useWindowManager';
import { appRegistry } from '../components/os/osAppRegistry';
import type { AppDefinition, ContextMenuState, ContextMenuEntry } from '../components/os/types';

export default function OShome() {
  // Redirect to dashboard on mobile — OS desktop requires a large screen
  if (window.innerWidth < 768) {
    return <Navigate to="/dashboard" replace />;
  }
  const {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    moveWindow,
    resizeWindow,
  } = useWindowManager();

  const [booting, setBooting] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleOpenApp = useCallback(
    (app: AppDefinition) => {
      openWindow(app);
    },
    [openWindow]
  );

  const handleTaskbarWindowClick = useCallback(
    (id: string) => {
      const win = windows.find(w => w.id === id);
      if (win?.isMinimized) {
        focusWindow(id);
      } else {
        minimizeWindow(id);
      }
    },
    [windows, focusWindow, minimizeWindow]
  );

  const showContextMenu = useCallback(
    (x: number, y: number, items: ContextMenuEntry[]) => {
      setStartOpen(false);
      setContextMenu({ x, y, items });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ fontFamily: 'system-ui, sans-serif' }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Boot screen */}
      {booting && <OSBootScreen onDone={() => setBooting(false)} />}

      {/* Desktop with icons */}
      <OSDesktop onOpenApp={handleOpenApp} onContextMenu={showContextMenu} />

      {/* Windows */}
      {windows.map(win => {
        const app = appRegistry.find(a => a.id === win.appId);
        if (!app) return null;
        return (
          <OSWindow
            key={win.id}
            win={win}
            app={app}
            onClose={() => closeWindow(win.id)}
            onFocus={() => focusWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onMaximize={() => maximizeWindow(win.id)}
            onMove={(x, y) => moveWindow(win.id, x, y)}
            onResize={(x, y, w, h) => resizeWindow(win.id, x, y, w, h)}
            onContextMenu={showContextMenu}
          />
        );
      })}

      {/* Start menu */}
      <OSStartMenu
        isOpen={startOpen}
        onClose={() => setStartOpen(false)}
        onOpenApp={handleOpenApp}
      />

      {/* Taskbar */}
      <OSTaskbar
        windows={windows}
        startOpen={startOpen}
        onStartClick={() => setStartOpen(prev => !prev)}
        onWindowClick={handleTaskbarWindowClick}
        onMinimizeWindow={minimizeWindow}
        onMaximizeWindow={maximizeWindow}
        onCloseWindow={closeWindow}
        onContextMenu={showContextMenu}
      />

      {/* Context menu — renders above everything */}
      <OSContextMenu menu={contextMenu} onClose={closeContextMenu} />
    </div>
  );
}

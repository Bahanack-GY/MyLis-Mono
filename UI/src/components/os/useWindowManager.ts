import { useState, useCallback, useRef } from 'react';
import type { WindowState, AppDefinition } from './types';

const TASKBAR_HEIGHT = 56;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zCounter = useRef(100);

  const nextZ = useCallback(() => {
    zCounter.current += 1;
    return zCounter.current;
  }, []);

  const openWindow = useCallback((app: AppDefinition) => {
    const id = `${app.id}-${Date.now()}`;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_HEIGHT;
    const w = Math.min(app.defaultWidth ?? 900, vw - 40);
    const h = Math.min(app.defaultHeight ?? 620, vh - 40);
    const x = Math.min(40 + Math.random() * 120, vw - w - 20);
    const y = Math.min(30 + Math.random() * 80, vh - h - 20);

    const win: WindowState = {
      id,
      appId: app.id,
      title: app.label,
      icon: app.icon,
      x,
      y,
      width: w,
      height: h,
      zIndex: nextZ(),
      isMinimized: false,
      isMaximized: false,
    };
    setWindows(prev => [...prev, win]);
  }, [nextZ]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: string) => {
    const z = nextZ();
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, zIndex: z, isMinimized: false } : w))
    );
  }, [nextZ]);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        if (w.isMaximized) {
          return {
            ...w,
            isMaximized: false,
            x: w.prevBounds?.x ?? 80,
            y: w.prevBounds?.y ?? 40,
            width: w.prevBounds?.width ?? 900,
            height: w.prevBounds?.height ?? 620,
            prevBounds: undefined,
            zIndex: nextZ(),
          };
        }
        return {
          ...w,
          isMaximized: true,
          prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight - TASKBAR_HEIGHT,
          zIndex: nextZ(),
        };
      })
    );
  }, [nextZ]);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, x, y, isMaximized: false, prevBounds: undefined } : w))
    );
  }, []);

  const resizeWindow = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      setWindows(prev =>
        prev.map(w =>
          w.id === id
            ? { ...w, x, y, width: Math.max(400, width), height: Math.max(300, height), isMaximized: false, prevBounds: undefined }
            : w
        )
      );
    },
    []
  );

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    moveWindow,
    resizeWindow,
  };
}

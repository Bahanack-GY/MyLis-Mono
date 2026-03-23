import { useState, useCallback } from 'react';
import OSDesktopIcon from './OSDesktopIcon';
import { appRegistry } from './osAppRegistry';
import type { AppDefinition, ContextMenuEntry } from './types';

interface OSDesktopProps {
  onOpenApp: (app: AppDefinition) => void;
  onContextMenu: (x: number, y: number, items: ContextMenuEntry[]) => void;
}

const TASKBAR_HEIGHT = 56;
const ICON_W = 80;
const ICON_H = 88;
const PAD = 16;
const STORAGE_KEY = 'os_icon_positions';
const WALLPAPER_KEY = 'os_wallpaper';

type Positions = Record<string, { x: number; y: number }>;

/* -- Wallpaper presets ---------------------------------------- */

interface WallpaperPreset {
  id: string;
  label: string;
  background: string;
}

const wallpapers: WallpaperPreset[] = [
  { id: 'deep-space',  label: 'Deep Space',  background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #0f0c29 100%)' },
  { id: 'ocean',       label: 'Ocean',       background: 'linear-gradient(135deg, #0a1628 0%, #0d3b66 35%, #1a5276 60%, #0a1628 100%)' },
  { id: 'sunset',      label: 'Sunset',      background: 'linear-gradient(135deg, #1a0a2e 0%, #6b2fa0 30%, #d35400 65%, #1a0a2e 100%)' },
  { id: 'emerald',     label: 'Emerald',     background: 'linear-gradient(135deg, #0a1a0f 0%, #1a4a2e 35%, #2d6a4f 60%, #0a1a0f 100%)' },
  { id: 'midnight',    label: 'Midnight',    background: 'linear-gradient(135deg, #020111 0%, #0a0e2a 40%, #141e30 70%, #020111 100%)' },
  { id: 'graphite',    label: 'Graphite',    background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 40%, #3a3a52 70%, #1a1a2e 100%)' },
  { id: 'rose',        label: 'Rose',        background: 'linear-gradient(135deg, #1a0a1a 0%, #4a1942 35%, #6b2d5b 60%, #1a0a1a 100%)' },
  { id: 'aurora',      label: 'Aurora',      background: 'linear-gradient(135deg, #0a0a2e 0%, #1a3a5c 25%, #0d6b4f 50%, #1a5c3a 75%, #0a2e0a 100%)' },
];

const DEFAULT_WALLPAPER = wallpapers[0];

function loadWallpaper(): WallpaperPreset {
  try {
    const id = localStorage.getItem(WALLPAPER_KEY);
    if (id) {
      const found = wallpapers.find(w => w.id === id);
      if (found) return found;
    }
  } catch { /* ignore */ }
  return DEFAULT_WALLPAPER;
}

/* -- Icon positions ------------------------------------------- */

function buildDefaultPositions(): Positions {
  const positions: Positions = {};
  const maxRows = Math.max(1, Math.floor((window.innerHeight - TASKBAR_HEIGHT - PAD * 2) / ICON_H));
  appRegistry.forEach((app, i) => {
    const col = Math.floor(i / maxRows);
    const row = i % maxRows;
    positions[app.id] = {
      x: PAD + col * ICON_W,
      y: PAD + row * ICON_H,
    };
  });
  return positions;
}

function buildSortedPositions(): Positions {
  const sorted = [...appRegistry].sort((a, b) => a.label.localeCompare(b.label));
  const positions: Positions = {};
  const maxRows = Math.max(1, Math.floor((window.innerHeight - TASKBAR_HEIGHT - PAD * 2) / ICON_H));
  sorted.forEach((app, i) => {
    const col = Math.floor(i / maxRows);
    const row = i % maxRows;
    positions[app.id] = {
      x: PAD + col * ICON_W,
      y: PAD + row * ICON_H,
    };
  });
  return positions;
}

function loadPositions(): Positions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Positions;
      const allPresent = appRegistry.every(a => parsed[a.id]);
      if (allPresent) return parsed;
    }
  } catch { /* ignore */ }
  return buildDefaultPositions();
}

function savePositions(positions: Positions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

/* -- Component ------------------------------------------------ */

export default function OSDesktop({ onOpenApp, onContextMenu }: OSDesktopProps) {
  const [positions, setPositions] = useState<Positions>(loadPositions);
  const [wallpaper, setWallpaper] = useState<WallpaperPreset>(loadWallpaper);

  const handleMove = useCallback((appId: string, x: number, y: number) => {
    setPositions(prev => {
      const next = { ...prev, [appId]: { x, y } };
      savePositions(next);
      return next;
    });
  }, []);

  const changeWallpaper = useCallback((wp: WallpaperPreset) => {
    setWallpaper(wp);
    localStorage.setItem(WALLPAPER_KEY, wp.id);
  }, []);

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(e.clientX, e.clientY, [
        {
          type: 'item',
          label: 'Sort by name',
          onClick: () => {
            const sorted = buildSortedPositions();
            savePositions(sorted);
            setPositions(sorted);
          },
        },
        {
          type: 'item',
          label: 'Reset icon layout',
          onClick: () => {
            const defaults = buildDefaultPositions();
            savePositions(defaults);
            setPositions(defaults);
          },
        },
        { type: 'divider' },
        { type: 'label', text: 'Wallpaper' },
        ...wallpapers.map(wp => ({
          type: 'item' as const,
          label: wp.label,
          checked: wp.id === wallpaper.id,
          onClick: () => changeWallpaper(wp),
        })),
        { type: 'divider' as const },
        {
          type: 'item' as const,
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      ]);
    },
    [onContextMenu, wallpaper.id, changeWallpaper]
  );

  const handleIconContextMenu = useCallback(
    (app: AppDefinition, x: number, y: number) => {
      onContextMenu(x, y, [
        {
          type: 'item',
          label: 'Open',
          onClick: () => onOpenApp(app),
        },
        { type: 'divider' },
        {
          type: 'item',
          label: 'Reset position',
          onClick: () => {
            const defaults = buildDefaultPositions();
            const defaultPos = defaults[app.id];
            if (defaultPos) {
              setPositions(prev => {
                const next = { ...prev, [app.id]: defaultPos };
                savePositions(next);
                return next;
              });
            }
          },
        },
      ]);
    },
    [onContextMenu, onOpenApp]
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: wallpaper.background,
        paddingBottom: TASKBAR_HEIGHT,
      }}
      onContextMenu={handleDesktopContextMenu}
    >
      {/* Centered logo watermark */}
      <img
        src="/Logo.png"
        alt=""
        draggable={false}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] object-contain opacity-40 pointer-events-none brightness-0 invert"
      />

      {appRegistry.map(app => (
        <OSDesktopIcon
          key={app.id}
          app={app}
          x={positions[app.id]?.x ?? 0}
          y={positions[app.id]?.y ?? 0}
          onOpen={onOpenApp}
          onMove={handleMove}
          onContextMenu={handleIconContextMenu}
        />
      ))}
    </div>
  );
}

import { useRef, useCallback } from 'react';
import OSMacIcon from './OSMacIcon';
import type { AppDefinition } from './types';

interface OSDesktopIconProps {
  app: AppDefinition;
  x: number;
  y: number;
  onOpen: (app: AppDefinition) => void;
  onMove: (appId: string, x: number, y: number) => void;
  onContextMenu: (app: AppDefinition, x: number, y: number) => void;
}

export default function OSDesktopIcon({ app, x, y, onOpen, onMove, onContextMenu }: OSDesktopIconProps) {
  const Icon = app.icon;
  const dragRef = useRef<{ startX: number; startY: number; iconX: number; iconY: number; moved: boolean } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, iconX: x, iconY: y, moved: false };

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragRef.current.moved = true;
        }
        onMove(app.id, dragRef.current.iconX + dx, dragRef.current.iconY + dy);
      };
      const handleUp = () => {
        dragRef.current = null;
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [x, y, app.id, onMove]
  );

  const handleDoubleClick = useCallback(() => {
    if (dragRef.current?.moved) return;
    onOpen(app);
  }, [app, onOpen]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(app, e.clientX, e.clientY);
    },
    [app, onContextMenu]
  );

  return (
    <div
      style={{ position: 'absolute', left: x, top: y }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex flex-col items-center gap-1.5 w-20 p-2 rounded-lg
                 hover:bg-white/10 transition-colors select-none cursor-default
                 focus:outline-none focus:bg-white/15"
    >
      <OSMacIcon icon={Icon} gradient={app.gradient} size={56} />
      <span className="text-[11px] text-white leading-tight text-center drop-shadow-md">
        {app.label}
      </span>
    </div>
  );
}

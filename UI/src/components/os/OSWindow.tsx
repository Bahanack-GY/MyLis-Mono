import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, Maximize2, X } from 'lucide-react';
import OSTitleBar from './OSTitleBar';
import type { WindowState, AppDefinition, ContextMenuEntry } from './types';

interface OSWindowProps {
  win: WindowState;
  app: AppDefinition;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (x: number, y: number, w: number, h: number) => void;
  onContextMenu: (x: number, y: number, items: ContextMenuEntry[]) => void;
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGE_SIZE = 6;
const TASKBAR_HEIGHT = 56;

const edgeStyles: Record<ResizeEdge, React.CSSProperties> = {
  n:  { top: -EDGE_SIZE, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE * 2, cursor: 'ns-resize' },
  s:  { bottom: -EDGE_SIZE, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE * 2, cursor: 'ns-resize' },
  e:  { right: -EDGE_SIZE, top: EDGE_SIZE, bottom: EDGE_SIZE, width: EDGE_SIZE * 2, cursor: 'ew-resize' },
  w:  { left: -EDGE_SIZE, top: EDGE_SIZE, bottom: EDGE_SIZE, width: EDGE_SIZE * 2, cursor: 'ew-resize' },
  ne: { top: -EDGE_SIZE, right: -EDGE_SIZE, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nesw-resize' },
  nw: { top: -EDGE_SIZE, left: -EDGE_SIZE, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nwse-resize' },
  se: { bottom: -EDGE_SIZE, right: -EDGE_SIZE, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nwse-resize' },
  sw: { bottom: -EDGE_SIZE, left: -EDGE_SIZE, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nesw-resize' },
};

export default function OSWindow({
  win,
  app,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onMove,
  onResize,
  onContextMenu,
}: OSWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // --- Close with animation ---
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  // --- Drag ---
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (win.isMaximized) return;
      e.preventDefault();
      onFocus();
      dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };
      setIsDragging(true);

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        onMove(dragRef.current.winX + dx, dragRef.current.winY + dy);
      };
      const handleUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [win.x, win.y, win.isMaximized, onFocus, onMove]
  );

  // --- Resize ---
  const handleResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.PointerEvent) => {
      if (win.isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      onFocus();
      setIsDragging(true);
      resizeRef.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y,
        origW: win.width,
        origH: win.height,
      };

      const handleMove = (ev: PointerEvent) => {
        const r = resizeRef.current;
        if (!r) return;
        const dx = ev.clientX - r.startX;
        const dy = ev.clientY - r.startY;
        let { origX: nx, origY: ny, origW: nw, origH: nh } = r;

        if (r.edge.includes('e')) nw = r.origW + dx;
        if (r.edge.includes('w')) { nw = r.origW - dx; nx = r.origX + dx; }
        if (r.edge.includes('s')) nh = r.origH + dy;
        if (r.edge.includes('n')) { nh = r.origH - dy; ny = r.origY + dy; }

        onResize(nx, ny, nw, nh);
      };
      const handleUp = () => {
        resizeRef.current = null;
        setIsDragging(false);
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [win.x, win.y, win.width, win.height, win.isMaximized, onFocus, onResize]
  );

  const handleTitleBarContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e.clientX, e.clientY, [
        {
          type: 'item',
          label: 'Minimize',
          icon: Minimize2,
          onClick: onMinimize,
        },
        {
          type: 'item',
          label: win.isMaximized ? 'Restore size' : 'Maximize',
          icon: Maximize2,
          onClick: onMaximize,
        },
        { type: 'divider' },
        {
          type: 'item',
          label: 'Close',
          icon: X,
          danger: true,
          onClick: handleClose,
        },
      ]);
    },
    [win.isMaximized, onContextMenu, onMinimize, onMaximize, handleClose]
  );

  // --- Animation state ---
  const minimizeY = window.innerHeight - TASKBAR_HEIGHT - win.y - win.height / 2;
  const isHidden = win.isMinimized || isClosing;

  const animate = isClosing
    ? { opacity: 0, scale: 0.6, y: 30 }
    : win.isMinimized
      ? { opacity: 0, scale: 0.25, y: minimizeY }
      : { opacity: 1, scale: 1, y: 0 };

  const transition = isClosing
    ? { duration: 0.25, ease: [0.4, 0, 1, 1] as [number, number, number, number] }
    : win.isMinimized
      ? { type: 'spring' as const, stiffness: 500, damping: 40 }
      : { type: 'spring' as const, stiffness: 400, damping: 28 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 60 }}
      animate={animate}
      transition={transition}
      style={{
        position: 'absolute',
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        pointerEvents: isHidden ? 'none' : 'auto',
        transformOrigin: 'bottom center',
      }}
      className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/10"
      onPointerDown={isHidden ? undefined : onFocus}
    >
      <OSTitleBar
        title={win.title}
        icon={win.icon}
        isMaximized={win.isMaximized}
        onClose={handleClose}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onPointerDown={handleDragStart}
        onContextMenu={handleTitleBarContextMenu}
      />

      {/* App content — iframe */}
      <div className="flex-1 relative bg-gray-50">
        <iframe
          src={app.route}
          className="absolute inset-0 w-full h-full border-0"
          title={app.label}
        />
        {/* Overlay blocks iframe pointer events during drag/resize */}
        {isDragging && (
          <div className="absolute inset-0" />
        )}
      </div>

      {/* Resize handles */}
      {!win.isMaximized &&
        (Object.entries(edgeStyles) as [ResizeEdge, React.CSSProperties][]).map(
          ([edge, style]) => (
            <div
              key={edge}
              style={{ ...style, position: 'absolute' }}
              onPointerDown={handleResizeStart(edge)}
            />
          )
        )}
    </motion.div>
  );
}

import type { LucideIcon } from 'lucide-react';

interface OSTitleBarProps {
  title: string;
  icon: LucideIcon;
  isMaximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function OSTitleBar({
  title,
  icon: Icon,
  isMaximized,
  onClose,
  onMinimize,
  onMaximize,
  onPointerDown,
  onContextMenu,
}: OSTitleBarProps) {
  return (
    <div
      className="flex items-center h-10 px-3 bg-[#1e2d42] select-none shrink-0"
      style={{ cursor: isMaximized ? 'default' : 'grab' }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-center gap-2 mr-3">
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all"
          onPointerDown={e => e.stopPropagation()}
        />
        <button
          onClick={e => { e.stopPropagation(); onMinimize(); }}
          className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all"
          onPointerDown={e => e.stopPropagation()}
        />
        <button
          onClick={e => { e.stopPropagation(); onMaximize(); }}
          className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all"
          onPointerDown={e => e.stopPropagation()}
        />
      </div>
      <Icon size={14} className="text-gray-400 mr-2 shrink-0" />
      <span className="text-sm text-gray-300 truncate">{title}</span>
    </div>
  );
}

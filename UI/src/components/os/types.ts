import type { LucideIcon } from 'lucide-react';

export type ContextMenuEntry =
  | { type: 'item'; label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean; disabled?: boolean; checked?: boolean }
  | { type: 'label'; text: string }
  | { type: 'divider' };

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuEntry[];
}

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon: LucideIcon;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  prevBounds?: { x: number; y: number; width: number; height: number };
}

export interface AppDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  route: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

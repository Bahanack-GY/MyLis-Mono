import type { LucideIcon } from 'lucide-react';

interface OSMacIconProps {
  icon: LucideIcon;
  gradient: string;
  size?: number;
}

export default function OSMacIcon({ icon: Icon, gradient, size = 48 }: OSMacIconProps) {
  const radius = size * 0.225;
  const iconSize = size * 0.5;

  return (
    <div
      style={{
        width: size,
        height: size,
        background: gradient,
        borderRadius: radius,
        boxShadow: `
          inset 0 1px 1px rgba(255, 255, 255, 0.4),
          inset 0 -1px 1px rgba(0, 0, 0, 0.1),
          0 2px 4px rgba(0, 0, 0, 0.2),
          0 4px 8px rgba(0, 0, 0, 0.1)
        `,
      }}
      className="flex items-center justify-center shrink-0 relative overflow-hidden"
    >
      <Icon size={iconSize} className="text-white drop-shadow-md" />
    </div>
  );
}

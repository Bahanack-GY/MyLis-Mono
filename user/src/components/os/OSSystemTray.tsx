import { useState, useEffect } from 'react';
import { Wifi, Volume2, Battery } from 'lucide-react';

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function OSSystemTray() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-gray-300 px-3">
      <Wifi size={14} />
      <Volume2 size={14} />
      <Battery size={14} />
      <div className="text-xs text-right leading-tight ml-1">
        <div>{formatTime(now)}</div>
        <div className="text-gray-400">{formatDate(now)}</div>
      </div>
    </div>
  );
}

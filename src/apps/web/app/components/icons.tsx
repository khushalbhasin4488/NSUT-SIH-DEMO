import React from 'react';

const paths: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />,
  grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
  gauge: <><path d="M4 4l3 3M20 4l-3 3M4 20a8 8 0 0 1 16 0" /><path d="M12 20a8 8 0 0 0 8-8H4a8 8 0 0 0 8 8Z" /><path d="M12 12l4-4" /></>,
  rupee: <path d="M6 4h12M6 9h12M6 4a4 4 0 0 1 0 8h-1l7 8" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="M4 12.5 9 17l11-11" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9" /></>,
  document: <><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  shield: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  bars: <><rect x="4" y="12" width="4" height="8" /><rect x="10" y="7" width="4" height="13" /><rect x="16" y="3" width="4" height="17" /></>,
  bell: <><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-5-5" /></>,
  chevronDown: <path d="M5 8l7 7 7-7" />,
  arrowRight: <path d="M4 12h16M13 5l7 7-7 7" />,
  arrowUpRight: <path d="M6 18 18 6M9 6h9v9" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></>,
  logout: <><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" /><path d="M14 8l5 4-5 4M19 12H9" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" /></>,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  pin: <><path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM19 14h2v2M14 19h2v2M19 19h2v2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  bank: <><path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M6 10v6M12 10v6M18 10v6" /></>,
  card: <><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19" /></>,
  smartphone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2" /><path d="M10.5 18h3" /></>,
};

export function Icon({ name, size = 16, strokeWidth = 1.8, className }: { name: keyof typeof paths; size?: number; strokeWidth?: number; className?: string }) {
  const body = paths[name];
  if (!body) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {body}
    </svg>
  );
}

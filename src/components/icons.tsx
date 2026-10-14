/** Inline stroke icons, 1.9px, matching the design's icon set. */
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

type P = { className?: string; size?: number };
const wrap = (size: number | undefined, className: string | undefined, children: React.ReactNode) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    {children}
  </svg>
);

export const IconHome = ({ className, size }: P) => wrap(size, className, <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>);
export const IconTrophy = ({ className, size }: P) => wrap(size, className, <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4" /><path d="M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M8 21h8M10 17h4" /></>);
export const IconGrid = ({ className, size }: P) => wrap(size, className, <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
export const IconSearch = ({ className, size }: P) => wrap(size, className, <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>);
export const IconLock = ({ className, size }: P) => wrap(size, className, <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IconCheck = ({ className, size }: P) => wrap(size, className, <path d="m5 12 4.5 4.5L19 7" />);
export const IconArrow = ({ className, size }: P) => wrap(size, className, <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>);
export const IconChevron = ({ className, size }: P) => wrap(size, className, <path d="m9 6 6 6-6 6" />);
export const IconHash = ({ className, size }: P) => wrap(size, className, <><path d="M5 9h14M5 15h14" /><path d="M10 4 8 20M16 4l-2 16" /></>);
export const IconClock = ({ className, size }: P) => wrap(size, className, <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>);
export const IconShield = ({ className, size }: P) => wrap(size, className, <><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>);
export const IconSend = ({ className, size }: P) => wrap(size, className, <><path d="m21 3-9 9" /><path d="M21 3 14 21l-2-9-9-2 18-7Z" /></>);
export const IconMessage = ({ className, size }: P) => wrap(size, className, <path d="M4 5h16v11H9l-5 4V5Z" />);
export const IconGlobe = ({ className, size }: P) => wrap(size, className, <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" /></>);
export const IconUser = ({ className, size }: P) => wrap(size, className, <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const IconLogout = ({ className, size }: P) => wrap(size, className, <><path d="M10 4H5v16h5" /><path d="m14 8 4 4-4 4M18 12H9" /></>);
export const IconData = ({ className, size }: P) => wrap(size, className, <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>);
export const IconBrain = ({ className, size }: P) => wrap(size, className, <><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3h3V4H9Z" /><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3h-3V4h3Z" /></>);
export const IconSpark = ({ className, size }: P) => wrap(size, className, <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />);
export const IconLayers = ({ className, size }: P) => wrap(size, className, <><path d="m12 4 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 16l8 4 8-4" /></>);
export const IconShare = ({ className, size }: P) => wrap(size, className, <><path d="M12 4v11" /><path d="m8 8 4-4 4 4" /><path d="M5 13v6h14v-6" /></>);
export const IconTelegram = ({ className, size }: P) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <path d="M21.6 4.4 3.5 11.3c-1.1.4-1.1 1 0 1.4l4.5 1.4 1.7 5.4c.2.6.4.8.8.8.5 0 .7-.2 1-.5l2.4-2.3 4.8 3.5c.9.5 1.5.2 1.7-.8l3.2-15c.3-1.3-.5-1.8-1.4-1.4ZM9.4 14.2l9-5.7c.4-.3.8 0 .5.3l-7.4 6.7-.3 3.2-1.8-4.5Z" />
  </svg>
);

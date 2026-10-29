/**
 * Icones desenhados em SVG, todos no mesmo traco e no mesmo peso.
 *
 * Regra do sistema: um icone nunca aparece sozinho. Ele sempre vem
 * acompanhado da palavra, porque nem todo mundo le o desenho do mesmo jeito.
 */

export type IconName =
  | "check"
  | "check-circle"
  | "close"
  | "camera"
  | "image"
  | "team"
  | "clipboard"
  | "list"
  | "pin"
  | "clock"
  | "alert"
  | "info"
  | "home"
  | "globe"
  | "exit"
  | "back"
  | "forward"
  | "plus"
  | "pencil"
  | "trash"
  | "refresh"
  | "person"
  | "calendar"
  | "search"
  | "settings"
  | "power"
  | "offline"
  | "loader";

const PATHS: Record<IconName, React.ReactNode> = {
  check: <path d="M4.5 12.5l5 5 10-11" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.7 2.7L16 9.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  camera: (
    <>
      <path d="M3 8.5A2.5 2.5 0 015.5 6h1.2l1.1-1.8A1.5 1.5 0 019.1 3.5h5.8a1.5 1.5 0 011.3.7L17.3 6h1.2A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M3 16.5l4.5-4.5 4 4 3-3 6.5 6.5" />
      <circle cx="8.5" cy="9.5" r="1.4" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <path d="M16.2 5.6a3 3 0 010 5.6M17.5 14.9c2 .5 3.4 2.2 3.4 4.4" />
    </>
  ),
  clipboard: (
    <>
      <path d="M8.5 4.5H7A2 2 0 005 6.5v12A2 2 0 007 20.5h10a2 2 0 002-2v-12a2 2 0 00-2-2h-1.5" />
      <rect x="8.5" y="2.8" width="7" height="3.6" rx="1.2" />
      <path d="M9 12.5l2 2 4-4.2" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
      <path d="M4.4 6.5h.02M4.4 12h.02M4.4 17.5h.02" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21c4-4.2 6-7.4 6-10a6 6 0 10-12 0c0 2.6 2 5.8 6 10z" />
      <circle cx="12" cy="10.8" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2l8.4 15H3.6z" />
      <path d="M12 9.8v4.4M12 17.2h.02" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.02" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.6L12 4l8 6.6" />
      <path d="M6 9.8V19a1.4 1.4 0 001.4 1.4h9.2A1.4 1.4 0 0018 19V9.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z" />
    </>
  ),
  exit: (
    <>
      <path d="M14 4.5h3.5A1.5 1.5 0 0119 6v12a1.5 1.5 0 01-1.5 1.5H14" />
      <path d="M10 8l-4 4 4 4M6 12h8" />
    </>
  ),
  back: <path d="M19 12H5m6-6l-6 6 6 6" />,
  forward: <path d="M5 12h14m-6-6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M4.5 19.5l.9-3.6L15.7 5.6a1.8 1.8 0 012.6 0l1.1 1.1a1.8 1.8 0 010 2.6L9.1 19.6z" />
      <path d="M14.4 6.9l2.7 2.7" />
    </>
  ),
  trash: (
    <>
      <path d="M4.8 7h14.4M9.5 7V4.8h5V7" />
      <path d="M6.6 7l.9 11.7A1.5 1.5 0 009 20.1h6a1.5 1.5 0 001.5-1.4L17.4 7" />
      <path d="M10.3 11v5.4M13.7 11v5.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 10-2.6 5.9" />
      <path d="M20 6.5V12h-5.4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20.2c0-3.5 3-6.1 7.2-6.1s7.2 2.6 7.2 6.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.2" />
      <path d="M3.6 10h16.8M8.4 3.6v3.2M15.6 3.6v3.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="M15.8 15.8L20.4 20.4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.2v2.6M12 18.2v2.6M4.6 7.6l2.2 1.3M17.2 15.1l2.2 1.3M4.6 16.4l2.2-1.3M17.2 8.9l2.2-1.3" />
    </>
  ),
  power: (
    <>
      <path d="M12 3.8v8" />
      <path d="M7.1 6.6a7.4 7.4 0 109.8 0" />
    </>
  ),
  offline: (
    <>
      <path d="M3.5 5.5l17 13" />
      <path d="M5 10.4a11 11 0 013.4-1.7M19 10.4a11 11 0 00-5.1-2.2M8.2 14a6.6 6.6 0 017.6.4" />
      <path d="M12 18.4h.02" />
    </>
  ),
  loader: <path d="M12 3.5a8.5 8.5 0 108.5 8.5" />,
};

export function Icon({
  name,
  size = 30,
  className,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
        >
      {PATHS[name]}
    </svg>
  );
}

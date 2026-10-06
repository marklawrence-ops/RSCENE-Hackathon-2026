// Line icons from the AGOS design (24×24, stroke = currentColor).

export type IconName =
  | "grid"
  | "map"
  | "storm"
  | "sliders"
  | "storage"
  | "clipboard"
  | "book"
  | "chevron"
  | "droplet"
  | "trend"
  | "shield"
  | "tank"
  | "rain"
  | "people"
  | "menu"
  | "close"
  | "wrench";

const paths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  storm: (
    <>
      <path d="M17.5 19H9a6 6 0 1 1 1.7-11.8A5 5 0 0 1 20 10a4 4 0 0 1-2.5 9Z" />
      <path d="m13 11-2 4h3l-2 4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h7M15 6h5M4 18h5M13 18h7M4 12h3M11 12h9" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </>
  ),
  storage: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v14c0 1.7 14 1.7 14 0V5M5 12c0 1.7 14 1.7 14 0" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" />
      <path d="M4 6.5v13M8 8h8" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  droplet: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" />,
  trend: (
    <>
      <path d="m3 17 6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  tank: (
    <>
      <path d="M6 4h12v16H6z" />
      <path d="M6 8h12M9 20v2M15 20v2M9 12h6" />
    </>
  ),
  rain: (
    <>
      <path d="M17 18H7a5 5 0 1 1 1.8-9.7A6 6 0 0 1 20 11a4 4 0 0 1-3 7Z" />
      <path d="m8 21 1-2M13 21l1-2M18 21l1-2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 7 5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z" />,
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

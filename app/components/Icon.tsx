export type IconName =
  | "dashboard" | "inbox" | "send" | "users" | "report" | "wallet"
  | "archive" | "settings" | "search" | "plus" | "refresh" | "download"
  | "printer" | "edit" | "trash" | "check" | "shield" | "activity"
  | "device" | "info" | "close" | "bell" | "menu" | "chevron-down";

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  inbox: <><path d="M4 4h16v16H4z"/><path d="M8 12h2l2 3 2-3h2"/><path d="M12 3v7"/><path d="m9 7 3 3 3-3"/></>,
  send: <><path d="M4 20h16V4H4z"/><path d="M12 14V7"/><path d="m9 10 3-3 3 3"/><path d="M8 16h8"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2"/><circle cx="17" cy="9" r="2"/><path d="M16 14h1a4 4 0 0 1 4 4v2"/></>,
  report: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4"/><path d="M8 12h8M8 16h8"/></>,
  wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v10H3z"/><path d="M3 6V5a2 2 0 0 1 2-2h13"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4z"/></>,
  archive: <><path d="M4 8h16v13H4z"/><path d="M3 3h18v5H3z"/><path d="M9 12h6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7-.7-2h-3l-.7 2-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2 .7v3l2 .7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2h3l.7-2 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  refresh: <><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/></>,
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></>,
  printer: <><path d="M7 8V3h10v5"/><path d="M6 18H4V9h16v9h-2"/><path d="M7 14h10v7H7z"/></>,
  edit: <><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 7 3 3"/></>,
  trash: <><path d="M4 7h16M9 3h6l1 4M7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  shield: <><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
  activity: <><path d="M4 19h16"/><path d="M7 16V9M12 16V5M17 16v-4"/></>,
  device: <><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M9 21h6M12 17v4"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3z"/><path d="M10 21h4"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  "chevron-down": <path d="m6 9 6 6 6-6"/>,
};

export default function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return <svg className={`ui-icon${className ? ` ${className}` : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
import type { ReactNode } from "react";

import type { CSSProperties } from 'react';
export type IconName = 'play' | 'people' | 'parts' | 'paint' | 'settings' | 'arrow' | 'close' | 'sound' | 'mute' | 'boost' | 'wheel' | 'back' | 'trophy' | 'clock' | 'shield' | 'target' | 'drift' | 'jump' | 'copy' | 'link' | 'check';
const paths: Record<IconName, React.ReactNode> = {
  play: <path d="m9 5 11 7-11 7Z" />,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>,
  parts: <><path d="m13 3 2 4 4 1 1 4-3 3 1 4-4 2-3-3-4 1-3-3 1-4-2-3 3-3 4 1Z" /><circle cx="12" cy="12" r="3" /></>,
  paint: <><path d="m15 3 6 6-9 9-7 1 1-7ZM13 5l6 6M5 20l-2 2" /><path d="M3 10c0-3 3-5 3-5s3 2 3 5a3 3 0 0 1-6 0Z" /></>,
  settings: <><path d="m10 3-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-3 1-3 3-1-1-4-3-1-2-3Z" /><circle cx="12" cy="12" r="3" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6 6-6-6 6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  sound: <><path d="M3 9h4l5-4v14l-5-4H3Z" /><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  mute: <><path d="M3 9h4l5-4v14l-5-4H3Z" /><path d="m17 9 5 6m0-6-5 6" /></>,
  boost: <path d="m13 2-9 12h7l-1 8 10-13h-8Z" />,
  wheel: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="m6 6 4 4m8-4-4 4m4 8-4-4m-8 4 4-4" /></>,
  trophy: <><path d="M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a5 5 0 0 0 5 5m9-8h4v3a5 5 0 0 1-5 5m-4 2v6m-5 0h10" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  shield: <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4" /></>,
  drift: <><path d="m6 3 3 6-3 6 3 6m6-18 3 6-3 6 3 6" /><path d="M4 9h16" /></>,
  jump: <><path d="M12 15V4m-4 4 4-4 4 4" /><path d="M4 20h16" /><path d="M7 16a5 5 0 0 0 10 0" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
  check: <path d="m4 12 6 6L20 6" />,
};
export function GameIcon({ name, size = 22, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">{paths[name]}</svg>;
}
/** One inline-SVG shape a `<svg>` can hold. Kept typed (not raw markup) so no template needs `innerHTML`/sanitization. */
export type IconShape =
  | { tag: 'path'; d: string }
  | { tag: 'circle'; cx: number; cy: number; r: number }
  | { tag: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { tag: 'polyline'; points: string }
  | { tag: 'polygon'; points: string };

export type IconName =
  | 'search'
  | 'bell'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'menu'
  | 'x'
  | 'plus'
  | 'lock'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-up'
  | 'download'
  | 'check'
  | 'check-circle'
  | 'triangle-alert'
  | 'circle-alert'
  | 'info'
  | 'layout-dashboard'
  | 'list-tree'
  | 'kanban'
  | 'timer'
  | 'settings'
  | 'log-out'
  | 'user'
  | 'users'
  | 'calendar'
  | 'link'
  | 'message-square'
  | 'history'
  | 'flag'
  | 'grip-vertical'
  | 'arrow-up'
  | 'arrow-down'
  | 'trash'
  | 'pencil'
  | 'filter'
  | 'refresh-cw'
  | 'loader'
  | 'external-link'
  | 'building'
  | 'star'
  | 'type-epic'
  | 'type-feature'
  | 'type-pbi'
  | 'type-bug'
  | 'type-task';

/** ~40 icons in Lucide's 24x24 outline style (stroke, round caps/joins), adapted for inline use with no external asset. */
export const ICON_SHAPES: Record<IconName, readonly IconShape[]> = {
  search: [
    { tag: 'circle', cx: 11, cy: 11, r: 8 },
    { tag: 'line', x1: 21, y1: 21, x2: 16.65, y2: 16.65 },
  ],
  bell: [
    { tag: 'path', d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' },
    { tag: 'path', d: 'M10 21a2 2 0 0 0 4 0' },
  ],
  sun: [
    { tag: 'circle', cx: 12, cy: 12, r: 4 },
    { tag: 'line', x1: 12, y1: 2, x2: 12, y2: 4 },
    { tag: 'line', x1: 12, y1: 20, x2: 12, y2: 22 },
    { tag: 'line', x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 },
    { tag: 'line', x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 },
    { tag: 'line', x1: 2, y1: 12, x2: 4, y2: 12 },
    { tag: 'line', x1: 20, y1: 12, x2: 22, y2: 12 },
    { tag: 'line', x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 },
    { tag: 'line', x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 },
  ],
  moon: [{ tag: 'path', d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }],
  monitor: [
    { tag: 'rect', x: 2, y: 3, width: 20, height: 14, rx: 2 },
    { tag: 'line', x1: 8, y1: 21, x2: 16, y2: 21 },
    { tag: 'line', x1: 12, y1: 17, x2: 12, y2: 21 },
  ],
  menu: [
    { tag: 'line', x1: 4, y1: 6, x2: 20, y2: 6 },
    { tag: 'line', x1: 4, y1: 12, x2: 20, y2: 12 },
    { tag: 'line', x1: 4, y1: 18, x2: 20, y2: 18 },
  ],
  x: [
    { tag: 'line', x1: 18, y1: 6, x2: 6, y2: 18 },
    { tag: 'line', x1: 6, y1: 6, x2: 18, y2: 18 },
  ],
  plus: [
    { tag: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { tag: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  lock: [
    { tag: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 },
    { tag: 'path', d: 'M7 11V7a5 5 0 0 1 10 0v4' },
  ],
  'chevron-down': [{ tag: 'polyline', points: '6 9 12 15 18 9' }],
  'chevron-right': [{ tag: 'polyline', points: '9 18 15 12 9 6' }],
  'chevron-left': [{ tag: 'polyline', points: '15 18 9 12 15 6' }],
  'chevron-up': [{ tag: 'polyline', points: '18 15 12 9 6 15' }],
  download: [
    { tag: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
    { tag: 'polyline', points: '7 10 12 15 17 10' },
    { tag: 'line', x1: 12, y1: 15, x2: 12, y2: 3 },
  ],
  check: [{ tag: 'polyline', points: '20 6 9 17 4 12' }],
  'check-circle': [
    { tag: 'path', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' },
    { tag: 'polyline', points: '22 4 12 14.01 9 11.01' },
  ],
  'triangle-alert': [
    { tag: 'path', d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
    { tag: 'line', x1: 12, y1: 9, x2: 12, y2: 13 },
    { tag: 'line', x1: 12, y1: 17, x2: 12.01, y2: 17 },
  ],
  'circle-alert': [
    { tag: 'circle', cx: 12, cy: 12, r: 10 },
    { tag: 'line', x1: 12, y1: 8, x2: 12, y2: 12 },
    { tag: 'line', x1: 12, y1: 16, x2: 12.01, y2: 16 },
  ],
  info: [
    { tag: 'circle', cx: 12, cy: 12, r: 10 },
    { tag: 'line', x1: 12, y1: 16, x2: 12, y2: 12 },
    { tag: 'line', x1: 12, y1: 8, x2: 12.01, y2: 8 },
  ],
  'layout-dashboard': [
    { tag: 'rect', x: 3, y: 3, width: 7, height: 9, rx: 1 },
    { tag: 'rect', x: 14, y: 3, width: 7, height: 5, rx: 1 },
    { tag: 'rect', x: 14, y: 12, width: 7, height: 9, rx: 1 },
    { tag: 'rect', x: 3, y: 16, width: 7, height: 5, rx: 1 },
  ],
  'list-tree': [
    { tag: 'line', x1: 9, y1: 6, x2: 21, y2: 6 },
    { tag: 'line', x1: 9, y1: 12, x2: 21, y2: 12 },
    { tag: 'line', x1: 9, y1: 18, x2: 21, y2: 18 },
    { tag: 'path', d: 'M3 3v3a2 2 0 0 0 2 2h1' },
    { tag: 'path', d: 'M3 3v14a2 2 0 0 0 2 2h1' },
  ],
  kanban: [
    { tag: 'rect', x: 3, y: 3, width: 5, height: 18, rx: 1 },
    { tag: 'rect', x: 10, y: 3, width: 5, height: 10, rx: 1 },
    { tag: 'rect', x: 17, y: 3, width: 5, height: 14, rx: 1 },
  ],
  timer: [
    { tag: 'line', x1: 10, y1: 2, x2: 14, y2: 2 },
    { tag: 'line', x1: 12, y1: 14, x2: 15, y2: 11 },
    { tag: 'circle', cx: 12, cy: 14, r: 8 },
  ],
  settings: [
    { tag: 'circle', cx: 12, cy: 12, r: 3 },
    {
      tag: 'path',
      d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    },
  ],
  'log-out': [
    { tag: 'path', d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' },
    { tag: 'polyline', points: '16 17 21 12 16 7' },
    { tag: 'line', x1: 21, y1: 12, x2: 9, y2: 12 },
  ],
  user: [
    { tag: 'path', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' },
    { tag: 'circle', cx: 12, cy: 7, r: 4 },
  ],
  users: [
    { tag: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
    { tag: 'circle', cx: 9, cy: 7, r: 4 },
    { tag: 'path', d: 'M22 21v-2a4 4 0 0 0-3-3.87' },
    { tag: 'path', d: 'M16 3.13a4 4 0 0 1 0 7.75' },
  ],
  calendar: [
    { tag: 'rect', x: 3, y: 4, width: 18, height: 18, rx: 2 },
    { tag: 'line', x1: 16, y1: 2, x2: 16, y2: 6 },
    { tag: 'line', x1: 8, y1: 2, x2: 8, y2: 6 },
    { tag: 'line', x1: 3, y1: 10, x2: 21, y2: 10 },
  ],
  link: [
    { tag: 'path', d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
    { tag: 'path', d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  ],
  'message-square': [{ tag: 'path', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }],
  history: [
    { tag: 'path', d: 'M3 12a9 9 0 1 0 3-6.7L3 8' },
    { tag: 'polyline', points: '3 3 3 8 8 8' },
    { tag: 'line', x1: 12, y1: 7, x2: 12, y2: 12 },
    { tag: 'line', x1: 12, y1: 12, x2: 16, y2: 14 },
  ],
  flag: [
    { tag: 'path', d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z' },
    { tag: 'line', x1: 4, y1: 22, x2: 4, y2: 4 },
  ],
  'grip-vertical': [
    { tag: 'circle', cx: 9, cy: 5, r: 1 },
    { tag: 'circle', cx: 9, cy: 12, r: 1 },
    { tag: 'circle', cx: 9, cy: 19, r: 1 },
    { tag: 'circle', cx: 15, cy: 5, r: 1 },
    { tag: 'circle', cx: 15, cy: 12, r: 1 },
    { tag: 'circle', cx: 15, cy: 19, r: 1 },
  ],
  'arrow-up': [
    { tag: 'line', x1: 12, y1: 19, x2: 12, y2: 5 },
    { tag: 'polyline', points: '5 12 12 5 19 12' },
  ],
  'arrow-down': [
    { tag: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { tag: 'polyline', points: '19 12 12 19 5 12' },
  ],
  trash: [
    { tag: 'path', d: 'M3 6h18' },
    { tag: 'path', d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' },
    { tag: 'path', d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
    { tag: 'line', x1: 10, y1: 11, x2: 10, y2: 17 },
    { tag: 'line', x1: 14, y1: 11, x2: 14, y2: 17 },
  ],
  pencil: [{ tag: 'path', d: 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z' }],
  filter: [{ tag: 'polygon', points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }],
  'refresh-cw': [
    { tag: 'path', d: 'M21 12a9 9 0 0 1-15 6.7L3 16' },
    { tag: 'path', d: 'M3 12a9 9 0 0 1 15-6.7L21 8' },
    { tag: 'polyline', points: '21 3 21 8 16 8' },
    { tag: 'polyline', points: '3 16 3 21 8 21' },
  ],
  loader: [
    { tag: 'line', x1: 12, y1: 2, x2: 12, y2: 6 },
    { tag: 'line', x1: 12, y1: 18, x2: 12, y2: 22 },
    { tag: 'line', x1: 4.93, y1: 4.93, x2: 7.76, y2: 7.76 },
    { tag: 'line', x1: 16.24, y1: 16.24, x2: 19.07, y2: 19.07 },
    { tag: 'line', x1: 2, y1: 12, x2: 6, y2: 12 },
    { tag: 'line', x1: 18, y1: 12, x2: 22, y2: 12 },
    { tag: 'line', x1: 4.93, y1: 19.07, x2: 7.76, y2: 16.24 },
    { tag: 'line', x1: 16.24, y1: 7.76, x2: 19.07, y2: 4.93 },
  ],
  'external-link': [
    { tag: 'path', d: 'M15 3h6v6' },
    { tag: 'line', x1: 10, y1: 14, x2: 21, y2: 3 },
    { tag: 'path', d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
  ],
  building: [
    { tag: 'rect', x: 4, y: 2, width: 16, height: 20, rx: 1 },
    { tag: 'line', x1: 4, y1: 9, x2: 20, y2: 9 },
    { tag: 'line', x1: 4, y1: 14, x2: 20, y2: 14 },
    { tag: 'line', x1: 9, y1: 22, x2: 9, y2: 14 },
    { tag: 'line', x1: 15, y1: 22, x2: 15, y2: 14 },
  ],
  star: [{ tag: 'polygon', points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }],
  // Work item type markers (`app-work-item-type-icon`): a distinct shape per type, never colour alone.
  // Azure DevOps-style work item glyphs: crown, trophy, book, bug, clipboard with a check.
  'type-epic': [{ tag: 'path', d: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z' }, { tag: 'path', d: 'M5 21h14' }],
  'type-feature': [
    { tag: 'path', d: 'M7 4h10v5a5 5 0 0 1-10 0z' },
    { tag: 'path', d: 'M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8' },
  ],
  'type-pbi': [{ tag: 'path', d: 'M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM9 9h6M9 13h6' }],
  'type-bug': [
    { tag: 'path', d: 'M8 9a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0zM12 9v10' },
    { tag: 'path', d: 'M4 9l4 2M20 9l-4 2M4 16l4-1M20 16l-4-1M9 5L7 3M15 5l2-2' },
  ],
  'type-task': [
    { tag: 'path', d: 'M9 4h6v3H9zM7 5.5H5v15h14v-15h-2' },
    { tag: 'path', d: 'M8.5 14l2.5 2.5 4.5-5' },
  ],
};

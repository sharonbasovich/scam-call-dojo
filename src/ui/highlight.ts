import { normalize } from '../engine/detector';
import type { Flag } from '../engine/types';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Wraps each flag's evidence span in <mark>, escaping everything else. */
export function highlight(text: string, flags: Flag[]): string {
  const hay = normalize(text).toLowerCase();
  const ranges: [number, number, Flag][] = [];
  for (const f of flags) {
    const needle = normalize(f.evidence).toLowerCase();
    const i = needle ? hay.indexOf(needle) : -1;
    if (i >= 0) ranges.push([i, i + needle.length, f]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let out = '';
  let pos = 0;
  for (const [start, end, f] of ranges) {
    if (start < pos) continue;
    out += esc(text.slice(pos, start));
    const tone = f.side === 'caller' ? `tac-${f.category}` : f.move === 'verify' || f.move === 'refuse' ? 'good' : 'bad';
    out += `<mark class="${tone}" title="${esc(f.label)}">${esc(text.slice(start, end))}</mark>`;
    pos = end;
  }
  return out + esc(text.slice(pos));
}

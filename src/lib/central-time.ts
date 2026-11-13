/** Date helpers for the admin: schedule times are entered and shown in Central time (America/Chicago). */

const TZ = 'America/Chicago';
const pad = (n: number) => String(n).padStart(2, '0');

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function zonedParts(d: Date) {
  const p = Object.fromEntries(partsFormat.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

/** Central time offset from UTC in ms at that moment (e.g. -6h in winter). */
function offsetMs(d: Date): number {
  const p = zonedParts(d);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(d.getTime() / 1000) * 1000;
}

/** ISO timestamp -> value for <input type="datetime-local"> in Central time. */
export function isoToCentralInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = zonedParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** <input type="datetime-local"> value read as Central time -> ISO timestamp. */
export function centralInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ts = guess - offsetMs(new Date(guess));
  ts = guess - offsetMs(new Date(ts));
  return new Date(ts).toISOString();
}

export function formatCentral(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Nov 10, 9:00 AM – Nov 20, 5:00 PM CT", "From …", "Until …" or "No dates". */
export function formatCentralRange(start: string | null, end: string | null): string {
  if (start && end) return `${formatCentral(start)} – ${formatCentral(end)} CT`;
  if (start) return `From ${formatCentral(start)} CT`;
  if (end) return `Until ${formatCentral(end)} CT`;
  return 'No dates';
}

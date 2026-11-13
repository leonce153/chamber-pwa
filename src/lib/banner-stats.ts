import { supabase } from '@/integrations/supabase/client';

/** Sponsor banner counters: one view per slide per app session (batched), and taps. */

const SEEN_KEY = 'home_banner_seen_v1';
const FLUSH_MS = 3000;
let queue: string[] = [];
let timer: number | undefined;

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // storage blocked: views may count again next time
  }
}

function send(kind: 'tap' | 'view', ids: string[]) {
  if (!supabase || ids.length === 0) return;
  supabase.functions.invoke('banner-stats', { body: { kind, ids } }).catch(() => undefined);
}

export function flushBannerViews() {
  if (timer) window.clearTimeout(timer);
  timer = undefined;
  const ids = queue;
  queue = [];
  for (let i = 0; i < ids.length; i += 10) send('view', ids.slice(i, i + 10));
}

export function recordBannerView(slideId: string) {
  const seen = readSeen();
  if (seen.has(slideId)) return;
  seen.add(slideId);
  writeSeen(seen);
  queue.push(slideId);
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(flushBannerViews, FLUSH_MS);
}

export function recordBannerTap(slideId: string) {
  send('tap', [slideId]);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBannerViews();
  });
}

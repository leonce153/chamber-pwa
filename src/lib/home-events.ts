import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Lang } from '@/lib/language';
import { loc, type HomeSection, type LinkTarget } from '@/lib/home-layout';
import { eventCount, manualEventStart, optionalTarget } from '@/lib/home-extra';

/** Upcoming events for an "events" section: from the website feed (server function, cached) or entered by hand. */

export interface HomeEvent {
  key: string;
  title: string;
  start: string;
  all_day: boolean;
  location: string | null;
  target: LinkTarget | null;
}

interface FeedEvent {
  title: string;
  start: string;
  all_day: boolean;
  location: string | null;
  url: string | null;
}

const TTL = 30 * 60 * 1000;
const TZ = 'America/Chicago';
const cacheKey = (id: string, url: string) => `home_events_v1_${id}_${url}`;

function readCache(key: string): {at: number;events: FeedEvent[];} | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && Array.isArray(v.events) ? v : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, events: FeedEvent[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), events }));
  } catch {
    // storage full or blocked
  }
}

const centralDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

function isUpcoming(e: {start: string;all_day: boolean;}, now: number): boolean {
  if (e.all_day) return centralDate(e.start) >= centralDate(new Date(now).toISOString());
  return new Date(e.start).getTime() >= now;
}

export function useHomeEvents(section: HomeSection, lang: Lang): HomeEvent[] {
  const s = section.settings;
  const isFeed = s.source === 'feed';
  const feedUrl = (s.feed_url ?? '').trim();
  const [feed, setFeed] = useState<FeedEvent[]>(() => isFeed && feedUrl ? readCache(cacheKey(section.id, feedUrl))?.events ?? [] : []);

  useEffect(() => {
    if (!isFeed || !feedUrl || !supabase) return;
    const key = cacheKey(section.id, feedUrl);
    const cached = readCache(key);
    if (cached) setFeed(cached.events);
    if (cached && Date.now() - cached.at < TTL) return;
    let cancelled = false;
    supabase.functions.
    invoke('get-home-events', { body: { section_id: section.id } }).
    then(({ data, error }) => {
      if (cancelled || error || !data || !Array.isArray(data.events)) return;
      setFeed(data.events as FeedEvent[]);
      writeCache(key, data.events as FeedEvent[]);
    }).
    catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isFeed, feedUrl, section.id]);

  const now = Date.now();
  const list: HomeEvent[] = isFeed ?
  (feedUrl ? feed : []).map((e, i) => ({
    key: `feed-${i}-${e.start}`,
    title: e.title,
    start: e.start,
    all_day: !!e.all_day,
    location: e.location,
    target: e.url && /^https?:\/\//i.test(e.url) ? { link_type: 'url', link_value: e.url, open_mode: 'auto' } : null
  })) :
  (s.events ?? []).flatMap((e) => {
    const start = manualEventStart(e);
    if (!start || !e.title?.trim()) return [];
    return [{
      key: e.id,
      title: loc(e.title, e.title_es, lang),
      start,
      all_day: !e.time,
      location: e.place?.trim() || null,
      target: optionalTarget(e)
    }];
  });

  return list.
  filter((e) => isUpcoming(e, now)).
  sort((a, b) => a.start.localeCompare(b.start)).
  slice(0, eventCount(s));
}

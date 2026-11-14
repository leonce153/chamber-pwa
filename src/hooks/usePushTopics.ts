import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PushTopic {
  id: string;
  name: string;
  name_es: string | null;
  description: string | null;
  description_es: string | null;
  tag: string;
  position: number;
  is_visible: boolean;
  default_on: boolean;
}

const PREFS_KEY = 'chamber_push_topics';

interface Prefs {
  /** Topic ids this device follows. */
  chosen: string[];
  /** Topic ids this device has already seen, so new "on by default" topics get switched on once. */
  seen: string[];
}

function readPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!Array.isArray(p?.chosen) || !Array.isArray(p?.seen)) return null;
    return { chosen: p.chosen.filter((x: unknown) => typeof x === 'string'), seen: p.seen.filter((x: unknown) => typeof x === 'string') };
  } catch {
    return null;
  }
}

function writePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* private mode: choices last for this visit only */
  }
}

/** Topic ids this browser follows (for showing only relevant updates in the app). */
export function followedTopicIds(): string[] {
  return readPrefs()?.chosen ?? [];
}

/** True if a sent notification went to everyone or to a topic this browser follows. */
export function isForThisDevice(n: { topic_ids?: string[] | null }, chosen: string[] = followedTopicIds()): boolean {
  return !n.topic_ids || n.topic_ids.length === 0 || n.topic_ids.some((id) => chosen.includes(id));
}

type GravitecQueue = { push: (args: unknown[]) => void };

function gravitec(): GravitecQueue | null {
  const g = (window as unknown as { Gravitec?: GravitecQueue }).Gravitec;
  return g && typeof g.push === 'function' ? g : null;
}

/**
 * Topics a subscriber can follow (e.g. City news, County alerts). Each topic is a Gravitec tag
 * on this device; the choice is also kept in this browser so the panel can show it.
 */
export function usePushTopics(subscribed: boolean) {
  const [topics, setTopics] = useState<PushTopic[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const syncedKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('push_topics')
        .select('id, name, name_es, description, description_es, tag, position, is_visible, default_on')
        .order('position', { ascending: true });
      if (cancelled) return;
      const list = ((data ?? []) as PushTopic[]).filter((t) => t.is_visible);
      const prefs = readPrefs() ?? { chosen: [], seen: [] };
      const ids = list.map((t) => t.id);
      const fresh = list.filter((t) => t.default_on && !prefs.seen.includes(t.id)).map((t) => t.id);
      const next: Prefs = {
        chosen: Array.from(new Set([...prefs.chosen, ...fresh])),
        seen: Array.from(new Set([...prefs.seen, ...ids])),
      };
      writePrefs(next);
      setTopics(list);
      setChosen(next.chosen.filter((id) => ids.includes(id)));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep this device's Gravitec tags in step with the chosen topics.
  useEffect(() => {
    if (!loaded || !subscribed || topics.length === 0) return;
    const tags = topics.filter((t) => chosen.includes(t.id)).map((t) => t.tag).sort();
    const key = tags.join(',');
    if (syncedKey.current === key) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      const g = gravitec();
      if (!g) {
        if (++tries < 5) timer = setTimeout(attempt, 2000);
        return;
      }
      const ok = () => {
        syncedKey.current = key;
      };
      const fail = () => {
        // Right after "Allow", the subscription can take a moment to register.
        if (++tries < 5) timer = setTimeout(attempt, 3000);
      };
      if (tags.length) g.push(['segmentation.setTags', tags, ok, fail]);
      else g.push(['segmentation.removeAllTags', ok, fail]);
    };
    attempt();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loaded, subscribed, topics, chosen]);

  const toggle = useCallback((id: string) => {
    setChosen((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const prefs = readPrefs() ?? { chosen: [], seen: [] };
      writePrefs({ chosen: next, seen: Array.from(new Set([...prefs.seen, id])) });
      return next;
    });
  }, []);

  return { topics, chosen, toggle, loaded };
}

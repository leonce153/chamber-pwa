import { supabase } from '@/integrations/supabase/client';

export interface SendableTopic {
  id: string;
  name: string;
  name_es: string | null;
  tag: string;
  is_visible: boolean;
}

export interface PushOptions {
  topics: SendableTopic[];
  canSendToEveryone: boolean;
  pushReady: boolean;
}

type PushResult<T> = (T & { success: true }) | { success: false; error: string };

/** Calls the push server function (send, test, draft, delete, options). */
export async function callPush<T extends object = object>(body: Record<string, unknown>): Promise<PushResult<T>> {
  if (!supabase) return { success: false, error: 'Database not connected' };
  const { data, error } = await supabase.functions.invoke('send-push-notification', { body });
  if (error) return { success: false, error: error.message || 'Request failed' };
  if (!data?.success) return { success: false, error: data?.error || 'Request failed' };
  return data;
}

/** Owner-only: make a stable Gravitec tag for a new topic. Renaming a topic never changes it. */
export function newTopicTag(id: string): string {
  return 'topic_' + id.replace(/-/g, '').slice(0, 10);
}

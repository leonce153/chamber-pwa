import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PushTopic } from '@/hooks/usePushTopics';
import { newTopicTag } from '@/lib/push-admin';
import { Loader2, Plus, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Check, X, Pencil, Tags } from 'lucide-react';

const input =
'w-full bg-input border border-border rounded-[10px] px-3 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]';

interface Draft {
  name: string;
  name_es: string;
  description: string;
  description_es: string;
  default_on: boolean;
}

const EMPTY: Draft = { name: '', name_es: '', description: '', description_es: '', default_on: true };

/**
 * Owner-only card on the Notifications page: the topics people can follow in the app.
 * Each topic is a Gravitec tag; renaming keeps the tag, so followers stay subscribed.
 */
export function TopicsManager({ onChange }: {onChange?: () => void;}) {
  const [topics, setTopics] = useState<PushTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    const { data, error: e } = await supabase.from('push_topics').select('*').order('position', { ascending: true });
    if (e) setError(e.message);
    setTopics((data ?? []) as PushTopic[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const changed = async () => {
    await load();
    onChange?.();
  };

  const startEdit = (t: PushTopic | null) => {
    setError(null);
    setEditing(t ? t.id : 'new');
    setDraft(t ? {
      name: t.name, name_es: t.name_es ?? '', description: t.description ?? '', description_es: t.description_es ?? '', default_on: t.default_on
    } : EMPTY);
  };

  const save = async () => {
    if (!supabase || !draft.name.trim()) return;
    setBusy(true);
    setError(null);
    const values = {
      name: draft.name.trim(),
      name_es: draft.name_es.trim() || null,
      description: draft.description.trim() || null,
      description_es: draft.description_es.trim() || null,
      default_on: draft.default_on,
      updated_at: new Date().toISOString()
    };
    let res;
    if (editing === 'new') {
      const id = crypto.randomUUID();
      const position = topics.reduce((m, t) => Math.max(m, t.position), -1) + 1;
      res = await supabase.from('push_topics').insert({ ...values, id, tag: newTopicTag(id), position, is_visible: true });
    } else {
      res = await supabase.from('push_topics').update(values).eq('id', editing);
    }
    setBusy(false);
    if (res.error) return setError(res.error.message);
    setEditing(null);
    changed();
  };

  const setVisible = async (t: PushTopic, is_visible: boolean) => {
    if (!supabase) return;
    const { error: e } = await supabase.from('push_topics').update({ is_visible, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (e) setError(e.message);else
    changed();
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!supabase) return;
    const other = topics[index + dir];
    const t = topics[index];
    if (!other) return;
    const next = [...topics];
    next[index] = other;
    next[index + dir] = t;
    setTopics(next);
    await Promise.all(next.map((x, i) => x.position === i ? null : supabase!.from('push_topics').update({ position: i }).eq('id', x.id)));
    changed();
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    const { error: e } = await supabase.from('push_topics').delete().eq('id', id);
    setConfirmDelete(null);
    if (e) setError(e.message);else
    changed();
  };

  const form =
  <div data-ev-id="topic_form" className="p-5 flex flex-col gap-3 bg-surface-raised">
      <div data-ev-id="topic_form_names" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label data-ev-id="topic_name_field" className="flex flex-col gap-1.5">
          <span data-ev-id="topic_name_label" className="text-sm font-medium text-text">Name</span>
          <input data-ev-id="topic_name_input" className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Emergency alerts" maxLength={60} autoFocus />
        </label>
        <label data-ev-id="topic_name_es_field" className="flex flex-col gap-1.5">
          <span data-ev-id="topic_name_es_label" className="text-sm font-medium text-text">Name in Spanish (optional)</span>
          <input data-ev-id="topic_name_es_input" className={input} value={draft.name_es} onChange={(e) => setDraft({ ...draft, name_es: e.target.value })} placeholder="Alertas de emergencia" maxLength={60} />
        </label>
        <label data-ev-id="topic_desc_field" className="flex flex-col gap-1.5">
          <span data-ev-id="topic_desc_label" className="text-sm font-medium text-text">Short description (optional)</span>
          <input data-ev-id="topic_desc_input" className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Severe weather, closures and urgent news" maxLength={120} />
        </label>
        <label data-ev-id="topic_desc_es_field" className="flex flex-col gap-1.5">
          <span data-ev-id="topic_desc_es_label" className="text-sm font-medium text-text">Description in Spanish (optional)</span>
          <input data-ev-id="topic_desc_es_input" className={input} value={draft.description_es} onChange={(e) => setDraft({ ...draft, description_es: e.target.value })} maxLength={120} />
        </label>
      </div>
      <label data-ev-id="topic_default_field" className="flex items-start gap-3 cursor-pointer">
        <input data-ev-id="topic_default_input" type="checkbox" checked={draft.default_on} onChange={(e) => setDraft({ ...draft, default_on: e.target.checked })} className="mt-1 w-4 h-4 accent-primary" />
        <span data-ev-id="topic_default_text" className="text-sm text-text-secondary text-pretty">
          <span data-ev-id="topic_default_strong" className="text-text font-medium">On by default.</span> People who turn on notifications follow this topic until they switch it off.
        </span>
      </label>
      <div data-ev-id="topic_form_actions" className="flex gap-2 justify-end">
        <button data-ev-id="topic_cancel" onClick={() => setEditing(null)} className="px-4 py-2 rounded-[10px] border border-border text-text min-h-[44px]">Cancel</button>
        <button data-ev-id="topic_save" onClick={save} disabled={busy || !draft.name.trim()} className="px-5 py-2 rounded-[10px] bg-primary hover:bg-primary-hover text-white font-medium min-h-[44px] disabled:opacity-50 flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save topic
        </button>
      </div>
    </div>;


  return (
    <div data-ev-id="topics_card" className="bg-card border border-border rounded-[16px] overflow-hidden mb-8">
      <div data-ev-id="topics_head" className="p-5 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div data-ev-id="topics_head_text">
          <h2 data-ev-id="topics_title" className="text-lg font-display font-bold text-text flex items-center gap-2"><Tags className="w-5 h-5 text-text-tertiary" /> Topics</h2>
          <p data-ev-id="topics_desc" className="text-sm text-text-secondary mt-1 text-pretty max-w-xl">
            Subscribers choose topics in the app's notification panel. Send to a topic to reach only its followers. On the Team page you can limit a sender to certain topics.
          </p>
        </div>
        {editing !== 'new' &&
        <button data-ev-id="topic_add" onClick={() => startEdit(null)} className="px-4 py-2 rounded-[10px] border border-border text-text font-medium flex items-center gap-2 min-h-[44px] hover:bg-surface-elevated">
            <Plus className="w-4 h-4" /> Add topic
          </button>
        }
      </div>

      {error && <p data-ev-id="topics_error" className="px-5 pt-4 text-sm text-destructive">{error}</p>}
      {editing === 'new' && form}

      {loading ?
      <div data-ev-id="topics_loading" className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
      topics.length === 0 && editing !== 'new' ?
      <p data-ev-id="topics_empty" className="p-5 text-sm text-text-tertiary">No topics yet. Without topics, every notification goes to everyone.</p> :

      <div data-ev-id="topics_list" className="divide-y divide-border">
          {topics.map((t, i) =>
        editing === t.id ? <div data-ev-id="topic_edit_row" key={t.id}>{form}</div> :
        <div data-ev-id="topic_row" key={t.id} className={`p-4 sm:px-5 flex items-center gap-3 flex-wrap ${t.is_visible ? '' : 'opacity-60'}`}>
              <div data-ev-id="topic_move" className="flex flex-col">
                <button data-ev-id="topic_up" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-text-tertiary hover:text-text disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                <button data-ev-id="topic_down" onClick={() => move(i, 1)} disabled={i === topics.length - 1} className="p-1 text-text-tertiary hover:text-text disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div data-ev-id="topic_info" className="flex-1 min-w-[160px]">
                <p data-ev-id="topic_name" className="font-medium text-text flex items-center gap-2 flex-wrap">
                  {t.name}
                  {t.name_es && <span data-ev-id="topic_name_es" className="text-text-tertiary text-sm font-normal">· {t.name_es}</span>}
                  {!t.is_visible && <span data-ev-id="topic_hidden_badge" className="text-xs px-2 py-0.5 rounded-[6px] bg-surface-raised text-text-tertiary">Hidden</span>}
                  {t.default_on && t.is_visible && <span data-ev-id="topic_default_badge" className="text-xs px-2 py-0.5 rounded-[6px] bg-primary/10 text-primary">On by default</span>}
                </p>
                {t.description && <p data-ev-id="topic_desc" className="text-sm text-text-secondary">{t.description}</p>}
              </div>
              <div data-ev-id="topic_actions" className="flex items-center gap-1">
                <button data-ev-id="topic_edit" onClick={() => startEdit(t)} className="p-2 text-text-tertiary hover:text-text rounded-[8px] hover:bg-surface-elevated" title="Rename"><Pencil className="w-4 h-4" /></button>
                <button data-ev-id="topic_visibility" onClick={() => setVisible(t, !t.is_visible)} className="p-2 text-text-tertiary hover:text-text rounded-[8px] hover:bg-surface-elevated" title={t.is_visible ? 'Hide from the app' : 'Show in the app'}>
                  {t.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {confirmDelete === t.id ?
            <span data-ev-id="topic_confirm" className="flex items-center gap-1">
                    <button data-ev-id="topic_confirm_yes" onClick={() => remove(t.id)} className="px-3 py-1.5 rounded-[8px] bg-destructive text-white text-sm">Delete</button>
                    <button data-ev-id="topic_confirm_no" onClick={() => setConfirmDelete(null)} className="p-2 text-text-tertiary" aria-label="Cancel"><X className="w-4 h-4" /></button>
                  </span> :
            <button data-ev-id="topic_delete" onClick={() => setConfirmDelete(t.id)} className="p-2 text-text-tertiary hover:text-destructive rounded-[8px] hover:bg-destructive/10" title="Delete (hiding is usually better)"><Trash2 className="w-4 h-4" /></button>
            }
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}

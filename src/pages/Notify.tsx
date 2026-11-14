import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/hooks/useApp';
import { AppLayout } from '@/components/layout/AppLayout';
import { TopicsManager } from '@/components/notify/TopicsManager';
import { callPush, type PushOptions } from '@/lib/push-admin';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Loader2,
  Send,
  Clock,
  Check,
  X,
  Bell,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Globe,
  Tag } from
'lucide-react';

type PushNotification = Tables<'push_notifications'>;

const field =
'w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary';

export default function Notify() {
  const { user, role } = useAuth();
  const { app, loading: appLoading } = useApp();
  const isOwner = role === 'owner';
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<PushOptions | null>(null);
  const [allTopicNames, setAllTopicNames] = useState<Record<string, string>>({});
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Compose form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [everyone, setEveryone] = useState(true);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sendableTopics = useMemo(() => (options?.topics ?? []).filter((t) => t.is_visible), [options]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotifications = useCallback(async () => {
    if (!supabase || !app) return;
    const { data } = await supabase.
    from('push_notifications').
    select('*').
    eq('app_id', app.id).
    order('created_at', { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  }, [app]);

  const fetchOptions = useCallback(async () => {
    const res = await callPush<PushOptions>({ action: 'options' });
    if (res.success) setOptions(res);
    if (supabase) {
      // Names for the history list, including hidden topics.
      const { data } = await supabase.from('push_topics').select('id, name');
      setAllTopicNames(Object.fromEntries((data ?? []).map((t: {id: string;name: string;}) => [t.id, t.name])));
    }
  }, []);

  useEffect(() => {
    if (app) fetchNotifications();
  }, [app, fetchNotifications]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const openCompose = (draft?: PushNotification) => {
    setSendError(null);
    setEditingId(draft?.id ?? null);
    setTitle(draft?.title ?? '');
    setBody(draft?.body ?? '');
    setUrl(draft?.url ?? '');
    const ids = (draft?.topic_ids ?? []).filter((id) => sendableTopics.some((t) => t.id === id));
    const canAll = options?.canSendToEveryone ?? true;
    setEveryone(canAll && ids.length === 0);
    setTopicIds(ids.length ? ids : !canAll && sendableTopics.length === 1 ? [sendableTopics[0].id] : []);
    setShowComposeModal(true);
  };

  const closeCompose = () => {
    setShowComposeModal(false);
    setSendError(null);
    setEditingId(null);
  };

  const audienceOk = everyone || topicIds.length > 0;
  const formOk = !!title.trim() && !!body.trim();

  const handleSend = async (asDraft: boolean) => {
    if (!app || !user) return;
    setSending(true);
    setSendError(null);
    const res = await callPush({
      action: asDraft ? 'draft' : 'send',
      notificationId: editingId ?? undefined,
      title: title.trim(),
      body: body.trim(),
      url: url.trim() || undefined,
      topicIds: everyone ? [] : topicIds
    });
    setSending(false);
    await fetchNotifications();
    if (res.success === false) return setSendError(res.error);
    closeCompose();
    flash(asDraft ? 'Draft saved' : 'Notification sent!');
  };

  const handleTestSend = async () => {
    if (!formOk) return;
    setSending(true);
    setSendError(null);
    const res = await callPush({ action: 'test', title: title.trim(), body: body.trim(), url: url.trim() || undefined });
    setSending(false);
    if (res.success === false) {
      const msg = res.error;
      setSendError(msg.includes('permission') || msg.includes('subscription') ?
      'Allow notifications for this app in your browser first, then try the test again.' :
      msg);
      return;
    }
    flash('Test sent to your devices');
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    const res = await callPush({ action: 'delete', notificationId: id });
    if (res.success === false) return flash(res.error);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const toggleTopic = (id: string) => {
    setEveryone(false);
    setTopicIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const audienceLabel = (n: PushNotification) => {
    const ids = n.topic_ids ?? [];
    if (!ids.length) return 'Everyone';
    return ids.map((id) => allTopicNames[id] ?? 'Deleted topic').join(', ');
  };

  const canChange = (n: PushNotification) => role === 'owner' || role === 'editor' || n.sent_by === user?.id;

  if (appLoading || loading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_2e190a6fe4" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  const noAudience = options && !options.canSendToEveryone && sendableTopics.length === 0;

  return (
    <AppLayout>
      <div data-ev-id="notify_page" className="p-4 sm:p-8">
        {/* Header */}
        <div data-ev-id="ev_2338e7eaca" className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div data-ev-id="ev_984a486b60">
            <h1 data-ev-id="ev_92b31d6289" className="text-[28px] font-display font-bold text-text tracking-tight">Notifications</h1>
            <p data-ev-id="ev_134a189418" className="text-text-secondary mt-1">
              {options && !options.canSendToEveryone ?
              `You can send to: ${sendableTopics.map((t) => t.name).join(', ') || 'no topics yet'}` :
              'Send push notifications to your subscribers'}
            </p>
          </div>
          <button data-ev-id="ev_9673266215"
          onClick={() => openCompose()}
          disabled={!!noAudience}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] disabled:opacity-50">

            <Plus className="w-4 h-4" />
            New notification
          </button>
        </div>

        {noAudience &&
        <div data-ev-id="notify_no_topics" className="bg-warning/10 border border-warning/20 rounded-[10px] p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p data-ev-id="notify_no_topics_text" className="text-sm text-text">You don't have any topics to send to yet. Ask the app owner to give you a topic on the Team page.</p>
          </div>
        }

        {options && !options.pushReady && isOwner &&
        <div data-ev-id="notify_not_ready" className="bg-warning/10 border border-warning/20 rounded-[10px] p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p data-ev-id="notify_not_ready_text" className="text-sm text-text">Push isn't set up yet. Add the Gravitec App Key and App Secret on the setup page, then send a test.</p>
          </div>
        }

        {/* Stats */}
        <div data-ev-id="ev_bb50ea5ba9" className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div data-ev-id="ev_9eb5c43379" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_96a9545136" className="flex items-center gap-3 mb-2">
              <Bell className="w-5 h-5 text-primary" />
              <span data-ev-id="ev_17c86d2438" className="text-text-secondary text-sm">Total sent</span>
            </div>
            <p data-ev-id="ev_094046da4b" className="text-[32px] font-display font-bold text-text">
              {notifications.filter((n) => n.status === 'sent').length}
            </p>
          </div>
          <div data-ev-id="ev_e3cdc3a574" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_c5b8e8b093" className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-accent" />
              <span data-ev-id="ev_15f6f96b47" className="text-text-secondary text-sm">Subscribers</span>
            </div>
            <p data-ev-id="ev_332dd7e7b2" className="text-[32px] font-display font-bold text-text">
              {app?.total_installs ?? 0}
            </p>
          </div>
          <div data-ev-id="ev_b59b9202c2" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_2e609d78df" className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-warning" />
              <span data-ev-id="ev_3153ffa524" className="text-text-secondary text-sm">Drafts</span>
            </div>
            <p data-ev-id="ev_4d30f100f5" className="text-[32px] font-display font-bold text-text">
              {notifications.filter((n) => n.status === 'draft').length}
            </p>
          </div>
        </div>

        {isOwner && <TopicsManager onChange={fetchOptions} />}

        {/* Notifications List */}
        <div data-ev-id="ev_d05fdac67f" className="bg-card border border-border rounded-[16px] overflow-hidden">
          <div data-ev-id="ev_08e2983a70" className="p-5 border-b border-border">
            <h2 data-ev-id="ev_d05e959ee2" className="text-lg font-display font-bold text-text">History</h2>
          </div>

          {notifications.length === 0 ?
          <div data-ev-id="ev_4ed3bce0b9" className="p-12 text-center">
              <Bell className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p data-ev-id="ev_3379979a88" className="text-text-secondary">No notifications yet</p>
              <p data-ev-id="ev_ee65ae9559" className="text-text-tertiary text-sm mt-1">Send your first notification to engage your audience</p>
            </div> :

          <div data-ev-id="ev_b094c1bf40" className="divide-y divide-border">
              {notifications.map((notif) => {
              const isDraft = notif.status === 'draft';
              const editable = isDraft && canChange(notif);
              const everyoneMsg = !(notif.topic_ids ?? []).length;
              return (
                <div data-ev-id="ev_828c4abb4e" key={notif.id} className="p-5 flex items-start gap-4">
                  <div data-ev-id="ev_2d1470efdd" className="w-10 h-10 rounded-[10px] bg-surface-raised flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-text-tertiary" />
                  </div>
                  <button data-ev-id="ev_cc54fc4979"
                  className="flex-1 min-w-0 text-left disabled:cursor-default"
                  disabled={!editable}
                  onClick={() => editable && openCompose(notif)}
                  title={editable ? 'Open draft' : undefined}>
                    <p data-ev-id="ev_9bf01c5b9c" className="font-medium text-text">{notif.title}</p>
                    <p data-ev-id="ev_941638921f" className="text-sm text-text-secondary mt-0.5 line-clamp-2">{notif.body}</p>
                    <p data-ev-id="notif_audience" className="text-xs mt-2 flex items-center gap-1.5 flex-wrap">
                      <span data-ev-id="notif_audience_chip" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] ${everyoneMsg ? 'bg-surface-raised text-text-secondary' : 'bg-primary/10 text-primary'}`}>
                        {everyoneMsg ? <Globe className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                        {audienceLabel(notif)}
                      </span>
                      {notif.sent_by_name && <span data-ev-id="notif_by" className="text-text-tertiary">by {notif.sent_by_name}</span>}
                    </p>
                    <p data-ev-id="ev_936fb22af1" className="text-xs text-text-tertiary mt-1">
                      {new Date(notif.sent_at ?? notif.created_at).toLocaleString()}
                      {notif.status === 'sent' && isOwner && <> · <a data-ev-id="ev_04e848297c" href="https://push.gravitec.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>Stats in Gravitec</a></>}
                    </p>
                  </button>
                  <div data-ev-id="ev_50ab8af745" className="flex items-center gap-3">
                    <span data-ev-id="ev_5cb6d78660"
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    notif.status === 'sent' ?
                    'bg-success/10 text-success' :
                    isDraft ?
                    'bg-warning/10 text-warning' :
                    notif.status === 'failed' ?
                    'bg-destructive/10 text-destructive' :
                    'bg-surface-raised text-text-tertiary'}`
                    }>

                      {notif.status === 'sent' ? 'Sent' : isDraft ? 'Draft' : notif.status === 'failed' ? 'Failed' : 'Pending'}
                    </span>
                    {canChange(notif) && (
                    confirmDelete === notif.id ?
                    <span data-ev-id="notif_confirm" className="flex items-center gap-1">
                          <button data-ev-id="notif_confirm_yes" onClick={() => handleDelete(notif.id)} className="px-3 py-1.5 rounded-[8px] bg-destructive text-white text-sm">Delete</button>
                          <button data-ev-id="notif_confirm_no" onClick={() => setConfirmDelete(null)} className="p-2 text-text-tertiary" aria-label="Cancel"><X className="w-4 h-4" /></button>
                        </span> :
                    <button data-ev-id="ev_e1552141f6"
                    onClick={() => setConfirmDelete(notif.id)}
                    title={notif.status === 'sent' ? 'Remove from the app\'s update list' : 'Delete'}
                    className="p-2 text-text-tertiary hover:text-destructive rounded-[8px] hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>)
                    }
                  </div>
                </div>);
            })}
            </div>
          }
        </div>

        {/* Compose Modal */}
        {showComposeModal &&
        <div data-ev-id="ev_ed92d513f8" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_9430cd3310" className="bg-card border border-border rounded-[16px] w-full max-w-lg p-5 sm:p-7 max-h-[92vh] overflow-y-auto">
              <div data-ev-id="ev_549dff7092" className="flex items-center justify-between mb-5">
                <h2 data-ev-id="ev_713f03d2a1" className="text-[22px] font-display font-bold text-text tracking-tight">
                  {editingId ? 'Edit draft' : 'Compose notification'}
                </h2>
                <button data-ev-id="ev_e9519435e4" onClick={closeCompose} className="p-2 text-text-tertiary hover:text-text rounded-[8px]" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {sendError &&
            <div data-ev-id="ev_cb301cf6eb" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-4 mb-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p data-ev-id="ev_e63411c677" className="text-sm text-destructive break-words min-w-0">{sendError}</p>
                </div>
            }

              <div data-ev-id="ev_581c60161b" className="flex flex-col gap-4">
                {/* Audience */}
                {(sendableTopics.length > 0 || !options?.canSendToEveryone) &&
              <fieldset data-ev-id="compose_audience" className="flex flex-col gap-2">
                    <legend data-ev-id="compose_audience_label" className="block text-sm font-medium text-text mb-2">Send to</legend>
                    {options?.canSendToEveryone &&
                <label data-ev-id="compose_everyone" className={`flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer ${everyone ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-elevated'}`}>
                        <input data-ev-id="compose_everyone_input" type="checkbox" checked={everyone} onChange={(e) => {setEveryone(e.target.checked);if (e.target.checked) setTopicIds([]);}} className="w-4 h-4 accent-primary" />
                        <Globe className="w-4 h-4 text-text-tertiary" />
                        <span data-ev-id="compose_everyone_text" className="text-sm text-text font-medium">Everyone</span>
                        <span data-ev-id="compose_everyone_hint" className="text-xs text-text-tertiary ml-auto">All subscribers</span>
                      </label>
                }
                    {sendableTopics.map((t) => {
                  const on = !everyone && topicIds.includes(t.id);
                  return (
                    <label data-ev-id="compose_topic" key={t.id} className={`flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer ${on ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-elevated'}`}>
                          <input data-ev-id="compose_topic_input" type="checkbox" checked={on} onChange={() => toggleTopic(t.id)} className="w-4 h-4 accent-primary" />
                          <Tag className="w-4 h-4 text-text-tertiary" />
                          <span data-ev-id="compose_topic_text" className="text-sm text-text">{t.name}</span>
                        </label>);
                })}
                    {!everyone && topicIds.length > 1 &&
                <p data-ev-id="compose_topics_hint" className="text-xs text-text-tertiary">Goes to anyone who follows at least one of these topics.</p>
                }
                  </fieldset>
              }

                <div data-ev-id="ev_3d707591e0">
                  <label data-ev-id="ev_51af840666" className="block text-sm font-medium text-text mb-2">Title</label>
                  <input data-ev-id="ev_bc5b962d12" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" maxLength={120} className={field} />
                </div>

                <div data-ev-id="ev_d75c1db110">
                  <label data-ev-id="ev_619bba9b96" className="block text-sm font-medium text-text mb-2">Message</label>
                  <textarea data-ev-id="ev_26f2eb5a5c" value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to say?" rows={3} maxLength={500} className={field + ' resize-none'} />
                </div>

                <div data-ev-id="ev_e507cd1f4d">
                  <label data-ev-id="ev_7417371b1b" className="block text-sm font-medium text-text mb-2">Link URL (optional)</label>
                  <input data-ev-id="ev_763c0b7fb0" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={field} />
                </div>

                <div data-ev-id="ev_44d2d5d583" className="flex gap-3 mt-2 flex-wrap">
                  <button data-ev-id="ev_9d5808308b"
                onClick={handleTestSend}
                disabled={sending || !formOk}
                className="bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] flex items-center gap-2 transition-colors disabled:opacity-50 min-h-[44px] border border-border">

                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send test to me
                  </button>
                  <button data-ev-id="ev_f3df6992dc"
                onClick={() => handleSend(true)}
                disabled={sending || !formOk || !audienceOk}
                className="bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors disabled:opacity-50 min-h-[44px] border border-border">

                    Save as draft
                  </button>
                  <button data-ev-id="ev_45a030c3c4"
                onClick={() => handleSend(false)}
                disabled={sending || !formOk || !audienceOk}
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]">

                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send now'}
                  </button>
                </div>
                {!audienceOk && <p data-ev-id="compose_pick_hint" className="text-xs text-text-tertiary -mt-2">Choose who to send to.</p>}
              </div>
            </div>
          </div>
        }

        {toast &&
        <div data-ev-id="ev_18ffbfd4ca" className="fixed bottom-6 right-6 bg-success text-white px-5 py-3 rounded-[10px] flex items-center gap-2 shadow-lg z-[60]">
            <Check className="w-5 h-5" />
            {toast}
          </div>
        }
      </div>
    </AppLayout>);

}

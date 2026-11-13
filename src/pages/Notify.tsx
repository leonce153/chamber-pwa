import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/hooks/useApp';
import { AppLayout } from '@/components/layout/AppLayout';
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
  AlertCircle } from
'lucide-react';

type PushNotification = Tables<'push_notifications'>;

// Helper to call the send-push-notification Edge Function
async function sendPushNotification(
notificationId: string,
title: string,
body: string,
url?: string,
testMode: boolean = false)
: Promise<{success: boolean;recipients?: number;message?: string;error?: string;gravitecResponse?: Record<string, unknown>;}> {
  if (!supabase) throw new Error('Database not connected');

  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { notificationId, title, body, url: url || undefined, testMode }
    });

    console.log('Edge Function response:', { data, error });

    if (error) {
      console.error('Edge Function invocation error:', error);
      // Extract real error from FunctionsHttpError response body
      if (error.context && typeof error.context.json === 'function') {
        try {
          const body = await error.context.json();
          throw new Error(body.error || body.message || 'Edge function error');
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== 'Edge function error') {
            // JSON parse failed, try text
            try {
              const text = await error.context.text();
              throw new Error(text || error.message);
            } catch {
              throw new Error(error.message || 'Failed to send notification');
            }
          }
          throw parseErr;
        }
      }
      throw new Error(error.message || 'Failed to connect to notification service');
    }

    if (!data) {
      throw new Error('No response from notification service');
    }

    if (!data.success) {
      const errorMessage = data.error || data.message || 'Failed to send notification';
      console.error('Edge Function returned error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('An unexpected error occurred while sending the notification');
  }
}

export default function Notify() {
  const { user } = useAuth();
  const { app, loading: appLoading } = useApp();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Compose form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!supabase || !app) return;
      setLoading(true);

      const { data } = await supabase.
      from('push_notifications').
      select('*').
      eq('app_id', app.id).
      order('created_at', { ascending: false });

      setNotifications(data ?? []);
      setLoading(false);
    };

    if (app) {
      fetchNotifications();
    }
  }, [app]);

  const handleSend = async (asDraft: boolean = false) => {
    if (!supabase || !app || !user) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      // Create notification record
      const { data: notif, error: createError } = await supabase.
      from('push_notifications').
      insert({
        app_id: app.id,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || null,
        status: asDraft ? 'draft' : 'sent',
        icon_url: app.icon_url
      }).
      select().
      single();

      if (createError) throw new Error(createError.message);

      if (!asDraft && notif) {
        // Send via Edge Function
        const result = await sendPushNotification(notif.id, title, body, url || undefined);

        // Update notification status
        await supabase
          .from('push_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            gravitec_push_id: (result.gravitecResponse?.taskId as string) || null
          })
          .eq('id', notif.id);
      }

      setSendSuccess(true);
      setTitle('');
      setBody('');
      setUrl('');
      setShowComposeModal(false);

      // Refresh list
      const { data } = await supabase.
      from('push_notifications').
      select('*').
      eq('app_id', app.id).
      order('created_at', { ascending: false });
      setNotifications(data ?? []);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send notification');
      console.error('Send notification error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTestSend = async () => {
    if (!supabase || !app || !title.trim() || !body.trim()) return;
    setSending(true);
    setSendError(null);

    try {
      // Create a test notification record
      const { data: notif, error: createError } = await supabase.
      from('push_notifications').
      insert({
        app_id: app.id,
        title: `[TEST] ${title.trim()}`,
        body: body.trim(),
        url: url.trim() || null,
        status: 'sent',
        icon_url: app.icon_url
      }).
      select().
      single();

      if (createError) throw new Error(createError.message);
      if (!notif) throw new Error('Failed to create notification record');

      // Send test via Edge Function
      await sendPushNotification(notif.id, `[TEST] ${title}`, body, url || undefined, true);

      // Update as sent
      await supabase.
      from('push_notifications').
      update({ status: 'sent', sent_at: new Date().toISOString() }).
      eq('id', notif.id);

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      if (errorMessage.includes('permission') || errorMessage.includes('subscription')) {
        setSendError('Allow notifications for this app in your browser first, then try the test again.');
      } else {
        setSendError(errorMessage);
      }
      console.error('Test send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from('push_notifications').delete().eq('id', id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  if (appLoading || loading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_2e190a6fe4" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  return (
    <AppLayout>
      <div data-ev-id="notify_page" className="p-8">
        {/* Header */}
        <div data-ev-id="ev_2338e7eaca" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_984a486b60">
            <h1 data-ev-id="ev_92b31d6289" className="text-[28px] font-display font-bold text-text tracking-tight">Notifications</h1>
            <p data-ev-id="ev_134a189418" className="text-text-secondary mt-1">Send push notifications to your subscribers</p>
          </div>
          <button data-ev-id="ev_9673266215"
          onClick={() => setShowComposeModal(true)}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">

            <Plus className="w-4 h-4" />
            New notification
          </button>
        </div>

        {/* Stats */}
        <div data-ev-id="ev_bb50ea5ba9" className="grid grid-cols-3 gap-6 mb-8">
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
              {notifications.map((notif) =>
            <div data-ev-id="ev_828c4abb4e" key={notif.id} className="p-5 flex items-start gap-4">
                  <div data-ev-id="ev_2d1470efdd" className="w-10 h-10 rounded-[10px] bg-surface-raised flex items-center justify-center">
                    <Bell className="w-5 h-5 text-text-tertiary" />
                  </div>
                  <div data-ev-id="ev_cc54fc4979" className="flex-1 min-w-0">
                    <p data-ev-id="ev_9bf01c5b9c" className="font-medium text-text">{notif.title}</p>
                    <p data-ev-id="ev_941638921f" className="text-sm text-text-secondary mt-0.5 line-clamp-2">{notif.body}</p>
                    <p data-ev-id="ev_936fb22af1" className="text-xs text-text-tertiary mt-2">
                      {new Date(notif.created_at).toLocaleString()}
                      {notif.status === 'sent' && <> · <a data-ev-id="ev_04e848297c" href="https://push.gravitec.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stats in Gravitec</a></>}
                    </p>
                  </div>
                  <div data-ev-id="ev_50ab8af745" className="flex items-center gap-3">
                    <span data-ev-id="ev_5cb6d78660"
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                notif.status === 'sent' ?
                'bg-success/10 text-success' :
                notif.status === 'draft' ?
                'bg-warning/10 text-warning' :
                'bg-surface-raised text-text-tertiary'}`
                }>

                      {notif.status === 'sent' ? 'Sent' : notif.status === 'draft' ? 'Draft' : 'Pending'}
                    </span>
                    <button data-ev-id="ev_e1552141f6"
                onClick={() => handleDelete(notif.id)}
                className="p-2 text-text-tertiary hover:text-destructive rounded-[8px] hover:bg-destructive/10 transition-colors">

                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
            )}
            </div>
          }
        </div>

        {/* Compose Modal */}
        {showComposeModal &&
        <div data-ev-id="ev_ed92d513f8" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_9430cd3310" className="bg-card border border-border rounded-[16px] w-full max-w-lg p-7">
              <div data-ev-id="ev_549dff7092" className="flex items-center justify-between mb-5">
                <h2 data-ev-id="ev_713f03d2a1" className="text-[22px] font-display font-bold text-text tracking-tight">
                  Compose notification
                </h2>
                <button data-ev-id="ev_e9519435e4"
              onClick={() => {
                setShowComposeModal(false);
                setSendError(null);
              }}
              className="p-2 text-text-tertiary hover:text-text rounded-[8px]">

                  <X className="w-5 h-5" />
                </button>
              </div>

              {sendError &&
            <div data-ev-id="ev_cb301cf6eb" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-4 mb-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p data-ev-id="ev_e63411c677" className="text-sm text-destructive">{sendError}</p>
                </div>
            }

              <div data-ev-id="ev_581c60161b" className="flex flex-col gap-4">
                <div data-ev-id="ev_3d707591e0">
                  <label data-ev-id="ev_51af840666" className="block text-sm font-medium text-text mb-2">Title</label>
                  <input data-ev-id="ev_bc5b962d12"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />

                </div>

                <div data-ev-id="ev_d75c1db110">
                  <label data-ev-id="ev_619bba9b96" className="block text-sm font-medium text-text mb-2">Message</label>
                  <textarea data-ev-id="ev_26f2eb5a5c"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What do you want to say?"
                rows={3}
                className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none" />

                </div>

                <div data-ev-id="ev_e507cd1f4d">
                  <label data-ev-id="ev_7417371b1b" className="block text-sm font-medium text-text mb-2">Link URL (optional)</label>
                  <input data-ev-id="ev_763c0b7fb0"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />

                </div>

                <div data-ev-id="ev_44d2d5d583" className="flex gap-3 mt-2">
                  <button data-ev-id="ev_9d5808308b"
                onClick={handleTestSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] flex items-center gap-2 transition-colors disabled:opacity-50 min-h-[44px] border border-border">

                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send test to me
                  </button>
                  <button data-ev-id="ev_f3df6992dc"
                onClick={() => handleSend(true)}
                disabled={sending || !title.trim() || !body.trim()}
                className="bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors disabled:opacity-50 min-h-[44px] border border-border">

                    Save as draft
                  </button>
                  <button data-ev-id="ev_45a030c3c4"
                onClick={() => handleSend(false)}
                disabled={sending || !title.trim() || !body.trim()}
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]">

                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        {/* Success toast */}
        {sendSuccess &&
        <div data-ev-id="ev_18ffbfd4ca" className="fixed bottom-6 right-6 bg-success text-white px-5 py-3 rounded-[10px] flex items-center gap-2 shadow-lg">
            <Check className="w-5 h-5" />
            Notification sent successfully!
          </div>
        }
      </div>
    </AppLayout>);

}
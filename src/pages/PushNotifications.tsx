import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Bell,
  Plus,
  Send,
  Clock,
  Users,
  Search,
  Trash2,
  ArrowLeft,
  Loader2,
  Smartphone,
  X,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle } from
'lucide-react';

// Helper to call the send-push-notification Edge Function
async function sendPushNotification(notificationId: string, title: string, body: string, url?: string) {
  if (!supabase) throw new Error('Database not connected');

  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      notificationId,
      title,
      body,
      url: url || undefined
    }
  });

  if (error) {
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
    throw new Error(error.message || 'Failed to send notification');
  }
  if (!data?.success) throw new Error(data?.error || 'Failed to send notification');

  return data;
}

type App = Tables<'apps'>;
type PushNotification = Tables<'push_notifications'>;

export default function PushNotifications() {
  const { appId } = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const fetchData = async () => {
    if (!supabase || !appId) return;

    const [appResult, notificationsResult] = await Promise.all([
    supabase.from('apps').select('*').eq('id', appId).single(),
    supabase.from('push_notifications').select('*').eq('app_id', appId).order('created_at', { ascending: false })]
    );

    if (appResult.data) setApp(appResult.data);
    setNotifications(notificationsResult.data ?? []);
    setLoading(false);
  };

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{type: 'success' | 'error';message: string;} | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const deleteNotification = async (id: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this notification?')) return;

    await supabase.from('push_notifications').delete().eq('id', id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const sendDraftNotification = async (notification: PushNotification) => {
    setSendingId(notification.id);
    try {
      const result = await sendPushNotification(
        notification.id,
        notification.title,
        notification.body,
        notification.url || undefined
      );

      // Update local state
      setNotifications(notifications.map((n) =>
      n.id === notification.id ?
      { ...n, status: 'sent', sent_at: new Date().toISOString(), gravitec_push_id: (result.gravitecResponse?.taskId as string) || null } :
      n
      ));

      showToast('success', 'Notification sent!');
    } catch (error) {
      console.error('Failed to send notification:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to send notification');
    } finally {
      setSendingId(null);
    }
  };

  const sentNotifications = notifications.filter((n) => n.status === 'sent');
  const draftNotifications = notifications.filter((n) => n.status === 'draft');

  if (loading) {
    return (
      <DashboardLayout>
        <div data-ev-id="ev_9a8e001521" className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>);

  }

  return (
    <DashboardLayout appName={app?.name} showBackToDashboard>
      <div data-ev-id="ev_84c70adf59" className="p-8">
        {/* Toast Notification */}
        {toast &&
        <div data-ev-id="ev_2e276994f1"
        className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
        toast.type === 'success' ?
        'bg-success text-white' :
        'bg-destructive text-white'}`
        }>

            {toast.type === 'success' ?
          <CheckCircle className="w-5 h-5" /> :

          <AlertCircle className="w-5 h-5" />
          }
            <span data-ev-id="ev_0466da2556" className="font-medium">{toast.message}</span>
            <button data-ev-id="ev_cb9157754a" onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        }

        {/* Header */}
        <div data-ev-id="ev_b71c40c043" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_6695a155a6">
            <Link data-ev-id="ev_cc1d466532"
            to={`/app/${appId}/edit`}
            className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm mb-2">

              <ArrowLeft className="w-4 h-4" />
              Back to Editor
            </Link>
            <h1 data-ev-id="ev_ef4191a2f0" className="text-2xl font-bold text-text">Push Notifications</h1>
            <p data-ev-id="ev_f846581c0b" className="text-muted mt-1">Send notifications to your app users</p>
          </div>
          <button data-ev-id="ev_b2add06311"
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors">

            <Plus className="w-5 h-5" />
            New Notification
          </button>
        </div>

        {/* Stats */}
        <div data-ev-id="ev_8c9e95d255" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div data-ev-id="ev_0e7ab10204" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_21cf3e1449" className="flex items-center gap-4">
              <div data-ev-id="ev_ec49585183" className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div data-ev-id="ev_2b23811c4a">
                <p data-ev-id="ev_abdb67ecca" className="text-2xl font-bold text-text">{app?.total_installs ?? 0}</p>
                <p data-ev-id="ev_90bc56cdc5" className="text-sm text-muted">Subscribers</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_761367a248" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_56bd19ce7f" className="flex items-center gap-4">
              <div data-ev-id="ev_c1a6d1105f" className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-success" />
              </div>
              <div data-ev-id="ev_6b2f88aa81">
                <p data-ev-id="ev_f191d467f6" className="text-2xl font-bold text-text">{sentNotifications.length}</p>
                <p data-ev-id="ev_f5e5941016" className="text-sm text-muted">Sent</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_ebe28b8361" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_b8e3593b84" className="flex items-center gap-4">
              <div data-ev-id="ev_48f41d05d8" className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div data-ev-id="ev_461f44be7f">
                <p data-ev-id="ev_b8c5d8a033" className="text-2xl font-bold text-text">{draftNotifications.length}</p>
                <p data-ev-id="ev_3cc696d8fd" className="text-sm text-muted">Drafts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div data-ev-id="ev_1b7cff0c4b" className="bg-surface border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_8c6d18d7d7" className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div data-ev-id="ev_855fe29063" className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_e73696b336" className="text-lg font-semibold text-text">All Notifications</h2>
              <span data-ev-id="ev_439050201c" className="bg-primary/20 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            </div>
            <div data-ev-id="ev_10fb18fa58" className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input data-ev-id="ev_4e4695d0cc"
              type="text"
              placeholder="Search notifications..."
              className="bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text placeholder:text-muted w-64 focus:outline-none focus:ring-2 focus:ring-primary" />

            </div>
          </div>

          {notifications.length === 0 ?
          <div data-ev-id="ev_488f8a0c24" className="p-12 text-center">
              <Bell className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 data-ev-id="ev_3c33bbe905" className="text-lg font-medium text-text mb-2">No notifications yet</h3>
              <p data-ev-id="ev_b58ab3e262" className="text-muted mb-4">Create your first push notification to engage your users</p>
              <button data-ev-id="ev_ba7b33afa5"
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg inline-flex items-center gap-2 transition-colors">

                <Plus className="w-4 h-4" />
                Create Notification
              </button>
            </div> :

          <div data-ev-id="ev_1d565a0dc9" className="divide-y divide-border">
              {notifications.map((notification) =>
            <div data-ev-id="ev_aafdf0e35a" key={notification.id} className="p-6 hover:bg-surface-elevated transition-colors">
                  <div data-ev-id="ev_345b5d16c2" className="flex items-start gap-4">
                    <div data-ev-id="ev_5c71bc5d36" className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Bell className="w-6 h-6 text-primary" />
                    </div>
                    <div data-ev-id="ev_99fe34c0df" className="flex-1 min-w-0">
                      <div data-ev-id="ev_71b7512e4e" className="flex items-center gap-2 mb-1">
                        <h3 data-ev-id="ev_dcd3d0de86" className="font-medium text-text">{notification.title}</h3>
                        <span data-ev-id="ev_cb47fb8905" className={`text-xs font-medium px-2 py-0.5 rounded ${
                    notification.status === 'sent' ?
                    'bg-success/20 text-success' :
                    notification.status === 'scheduled' ?
                    'bg-warning/20 text-warning' :
                    'bg-muted/20 text-muted'}`
                    }>
                          {notification.status}
                        </span>
                      </div>
                      <p data-ev-id="ev_facb461bbb" className="text-muted text-sm mb-2 line-clamp-2">{notification.body}</p>
                      <div data-ev-id="ev_03cbe57af4" className="flex items-center gap-4 text-xs text-muted">
                        {notification.sent_at &&
                    <span data-ev-id="ev_143d0cef7c" className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Sent {new Date(notification.sent_at).toLocaleDateString()}
                          </span>
                    }
                        <a data-ev-id="ev_c4d6deae9a" href="https://push.gravitec.net" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <Users className="w-3 h-3" />
                          Stats in Gravitec
                        </a>
                      </div>
                    </div>
                    <div data-ev-id="ev_62a53a4b8c" className="flex items-center gap-2">
                      {notification.status === 'draft' &&
                  <button data-ev-id="ev_734c762d47"
                  onClick={() => sendDraftNotification(notification)}
                  disabled={sendingId === notification.id}
                  className="bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50">

                          {sendingId === notification.id ?
                    <Loader2 className="w-4 h-4 animate-spin" /> :

                    <Send className="w-4 h-4" />
                    }
                          {sendingId === notification.id ? 'Sending...' : 'Send'}
                        </button>
                  }
                      <button data-ev-id="ev_971239a9bb"
                  onClick={() => deleteNotification(notification.id)}
                  className="p-2 text-muted hover:text-destructive bg-surface-elevated hover:bg-destructive/10 rounded-lg transition-colors">

                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
            )}
            </div>
          }
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && app &&
      <CreateNotificationModal
        appId={app.id}
        onClose={() => setShowCreateModal(false)}
        onCreated={(notification) => {
          setNotifications([notification, ...notifications]);
          setShowCreateModal(false);
        }} />

      }
    </DashboardLayout>);

}

function CreateNotificationModal({
  appId,
  onClose,
  onCreated




}: {appId: string;onClose: () => void;onCreated: (notification: PushNotification) => void;}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent, send: boolean = false) => {
    e.preventDefault();
    if (!supabase || !title.trim() || !body.trim()) return;

    setLoading(true);
    setError('');

    try {
      // First, create the notification record
      const { data, error: createError } = await supabase
        .from('push_notifications')
        .insert({
          app_id: appId,
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || null,
          status: 'draft', // Always create as draft first
          sent_at: null,
          recipients_count: null
        })
        .select()
        .single();

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      // If send is true, call the Edge Function to actually send the notification
      if (send && data) {
        const result = await sendPushNotification(
          data.id,
          title.trim(),
          body.trim(),
          url.trim() || undefined
        );

        // Update the local data with sent info
        const updatedNotification = {
          ...data,
          status: 'sent' as const,
          sent_at: new Date().toISOString(),
          recipients_count: result.recipients || 0
        };

        onCreated(updatedNotification);
        return;
      }

      // If just saving as draft
      if (data) {
        onCreated(data);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
      setLoading(false);
    }
  };

  return (
    <div data-ev-id="ev_fe8bd06f1d" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_1ccbcfb84d" className="bg-surface border border-border rounded-xl w-full max-w-lg">
        <div data-ev-id="ev_3175f4a7de" className="flex items-center justify-between p-6 border-b border-border">
          <h2 data-ev-id="ev_cfea3a1eba" className="text-xl font-semibold text-text">New Push Notification</h2>
          <button data-ev-id="ev_4a06bf4f84" onClick={onClose} className="text-muted hover:text-text transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form data-ev-id="ev_133a1ef3a7" onSubmit={(e) => handleSubmit(e, false)} className="p-6 flex flex-col gap-4">
          {/* Preview */}
          <div data-ev-id="ev_c2651f98ed" className="bg-surface-elevated border border-border rounded-xl p-4">
            <p data-ev-id="ev_1be94dad91" className="text-xs text-muted mb-2">Preview</p>
            <div data-ev-id="ev_59d903bfa1" className="flex items-start gap-3">
              <div data-ev-id="ev_a6bac76f1f" className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div data-ev-id="ev_de7dbfb831" className="flex-1 min-w-0">
                <p data-ev-id="ev_8c45bbabc4" className="font-medium text-text text-sm truncate">
                  {title || 'Notification Title'}
                </p>
                <p data-ev-id="ev_4bd7927e7f" className="text-muted text-sm line-clamp-2">
                  {body || 'Notification message will appear here...'}
                </p>
              </div>
            </div>
          </div>

          <div data-ev-id="ev_39ddeb1647">
            <label data-ev-id="ev_36804cd32a" className="block text-sm font-medium text-text mb-1.5">Title</label>
            <input data-ev-id="ev_1c56f16e88"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Notification title"
            maxLength={100}
            required />

          </div>

          <div data-ev-id="ev_c766654e16">
            <label data-ev-id="ev_d64f74d1d1" className="block text-sm font-medium text-text mb-1.5">Message</label>
            <textarea data-ev-id="ev_e56298f246"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Write your message..."
            rows={3}
            maxLength={500}
            required />

          </div>

          <div data-ev-id="ev_53875639fa">
            <label data-ev-id="ev_cb5d1de365" className="block text-sm font-medium text-text mb-1.5">
              Link URL <span data-ev-id="ev_dc5d10f1b7" className="text-muted">(optional)</span>
            </label>
            <div data-ev-id="ev_d51ee4da7c" className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input data-ev-id="ev_93d2ef1e5f"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com" />

            </div>
          </div>

          {error &&
          <div data-ev-id="ev_7fb6018fb7" className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {error}
            </div>
          }

          <div data-ev-id="ev_0a608bad20" className="flex gap-3 mt-2">
            <button data-ev-id="ev_1dff03905c"
            type="submit"
            disabled={loading || !title.trim() || !body.trim()}
            className="flex-1 bg-surface-elevated hover:bg-border text-text font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50">

              Save as Draft
            </button>
            <button data-ev-id="ev_a73caa439d"
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
            disabled={loading || !title.trim() || !body.trim()}
            className="flex-1 bg-success hover:bg-success/90 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">

              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
              <>
                  <Send className="w-4 h-4" />
                  Send Now
                </>
              }
            </button>
          </div>
        </form>
      </div>
    </div>);

}
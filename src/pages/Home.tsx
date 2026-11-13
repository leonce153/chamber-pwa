import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/hooks/useApp';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusPill } from '@/components/StatusPill';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Loader2,
  Check,
  ArrowRight,
  Send,
  Users,
  Eye,
  ExternalLink,
  Bell,
  TrendingUp,
  Clock } from
'lucide-react';

type PushNotification = Tables<'push_notifications'>;

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Get first name from user
function getFirstName(user: {user_metadata?: {full_name?: string;};email?: string;} | null): string {
  if (!user) return 'there';
  const fullName = user.user_metadata?.full_name;
  if (fullName) return fullName.split(' ')[0];
  return user.email?.split('@')[0] || 'there';
}

export default function Home() {
  const { user } = useAuth();
  const { app, features, loading: appLoading } = useApp();
  const { settings, loading: settingsLoading } = useAppSettings();
  const [recentNotifications, setRecentNotifications] = useState<PushNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const navigate = useNavigate();

  const greeting = getGreeting();
  const firstName = getFirstName(user);
  const loading = appLoading || settingsLoading;

  // Fetch recent notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!supabase || !app) return;
      setNotificationsLoading(true);

      const { data } = await supabase.
      from('push_notifications').
      select('*').
      eq('app_id', app.id).
      order('created_at', { ascending: false }).
      limit(5);

      setRecentNotifications(data ?? []);
      setNotificationsLoading(false);
    };

    if (app) {
      fetchNotifications();
    }
  }, [app]);

  // Checklist computation
  const checklistSteps = useMemo(() => {
    if (!app) return [];
    const hasFeatures = features.length > 0;
    const hasLogo = !!app.icon_url || !!settings?.icon_url;
    const hasBrandColors = !!app.theme_color || !!settings?.primary_color;
    const isPublished = app.status === 'active';
    const hasSentPush = (app.total_installs ?? 0) > 0 || recentNotifications.length > 0;

    return [
    { id: 'create', label: 'Create your app', done: true, link: '/admin/build' },
    { id: 'features', label: 'Add features', done: hasFeatures, link: '/admin/build' },
    { id: 'brand', label: 'Add your logo and brand colors', done: hasLogo && hasBrandColors, link: '/admin/build' },
    { id: 'publish', label: 'Publish and share your install link', done: isPublished, link: '/admin/distribute' },
    { id: 'push', label: 'Send your first push notification', done: hasSentPush, link: '/admin/notify' }];

  }, [app, features, settings, recentNotifications]);

  const completedSteps = checklistSteps.filter((s) => s.done).length;
  const allStepsComplete = checklistSteps.length > 0 && completedSteps === checklistSteps.length;
  const nextStep = checklistSteps.find((s) => !s.done);
  const progressPercent = checklistSteps.length > 0 ? Math.round(completedSteps / checklistSteps.length * 100) : 0;

  // Stats
  const totalSubscribers = app?.total_installs ?? settings?.total_subscribers ?? 0;
  const totalVisits = app?.total_visits ?? settings?.total_visits ?? 0;

  if (loading) {
    return (
      <AppLayout>
        <div data-ev-id="home_loading" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  return (
    <AppLayout>
      <div data-ev-id="home_page" className="p-8">
        {/* Header */}
        <div data-ev-id="header" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_2327607089">
            <h1 data-ev-id="greeting" className="text-[28px] font-display font-bold text-text tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p data-ev-id="subtitle" className="text-text-secondary mt-1">
              Here's what's happening with your app
            </p>
          </div>
          <button
            data-ev-id="compose_btn"
            onClick={() => navigate('/admin/notify')}
            className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">

            <Send className="w-4 h-4" />
            Compose notification
          </button>
        </div>

        {/* Stats Row */}
        <div data-ev-id="stats_row" className="grid grid-cols-3 gap-6 mb-8">
          <div data-ev-id="stat_subscribers" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_bb268895fb" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_87174a79ef" className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span data-ev-id="ev_5dc6518255" className="text-text-secondary text-sm">Subscribers</span>
            </div>
            <p data-ev-id="ev_a9c9a2b983" className="text-[32px] font-display font-bold text-text">{totalSubscribers.toLocaleString()}</p>
          </div>

          <div data-ev-id="stat_visits" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_97d04cf315" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_ab0736fcba" className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-accent" />
              </div>
              <span data-ev-id="ev_2c088eef02" className="text-text-secondary text-sm">Total visits</span>
            </div>
            <p data-ev-id="ev_788a4f410f" className="text-[32px] font-display font-bold text-text">{totalVisits.toLocaleString()}</p>
          </div>

          <div data-ev-id="stat_notifications" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_6ddaf8b422" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_ed24a83929" className="w-10 h-10 rounded-[10px] bg-success/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-success" />
              </div>
              <span data-ev-id="ev_feb1734b98" className="text-text-secondary text-sm">Notifications sent</span>
            </div>
            <p data-ev-id="ev_96ca9675ac" className="text-[32px] font-display font-bold text-text">
              {recentNotifications.filter((n) => n.status === 'sent').length}
            </p>
          </div>
        </div>

        <div data-ev-id="ev_ab2e69c6a6" className="grid grid-cols-2 gap-6">
          {/* App Summary Card */}
          <div data-ev-id="app_card" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_52d21f612f" className="flex items-start justify-between mb-4">
              <div data-ev-id="ev_2ccd44875b" className="flex items-center gap-4">
                {settings?.icon_url || app?.icon_url ?
                <img data-ev-id="ev_70c3ebbf48"
                src={settings?.icon_url ?? app?.icon_url ?? ''}
                alt={settings?.app_name ?? app?.name ?? 'App'}
                className="w-16 h-16 rounded-[12px] object-cover" /> :


                <div data-ev-id="ev_ead57634c8"
                className="w-16 h-16 rounded-[12px] flex items-center justify-center text-white text-2xl font-display font-bold"
                style={{ backgroundColor: settings?.primary_color ?? app?.theme_color ?? '#B8956B' }}>

                    {(settings?.app_name ?? app?.name ?? 'A').charAt(0).toUpperCase()}
                  </div>
                }
                <div data-ev-id="ev_cb38af256b">
                  <h3 data-ev-id="ev_0cf0c84f33" className="text-xl font-display font-bold text-text">
                    {settings?.app_name ?? app?.name ?? 'My App'}
                  </h3>
                  <p data-ev-id="ev_7b514a528b" className="text-text-secondary text-sm mt-0.5">
                    {settings?.description ?? app?.description ?? 'No description'}
                  </p>
                </div>
              </div>
              <StatusPill status={app?.status === 'active' ? 'published' : 'draft'} />
            </div>

            <div data-ev-id="ev_c180d352b2" className="flex gap-3">
              <Link data-ev-id="ev_a9465c8dd5"
              to="/admin/build"
              className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors min-h-[44px] border border-border">

                Open editor
              </Link>
              <a data-ev-id="ev_ff5c7bb279"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors min-h-[44px] border border-border">

                  <ExternalLink className="w-4 h-4" />
                  View live
                </a>
            </div>
          </div>

          {/* Setup Checklist */}
          {!allStepsComplete &&
          <div data-ev-id="checklist" className="bg-card border border-border rounded-[16px] p-6">
              <div data-ev-id="ev_e3a8007fa9" className="flex items-center justify-between mb-4">
                <h3 data-ev-id="ev_eeccc7fd27" className="text-lg font-display font-bold text-text">Setup checklist</h3>
                <span data-ev-id="ev_1c52fd8f73" className="text-sm text-text-secondary">{progressPercent}% complete</span>
              </div>

              {/* Progress bar */}
              <div data-ev-id="ev_b656b5bc0d" className="h-2 bg-surface-raised rounded-full mb-5 overflow-hidden">
                <div data-ev-id="ev_3d8b5b3334"
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }} />

              </div>

              <div data-ev-id="ev_1a9f24b652" className="flex flex-col gap-2">
                {checklistSteps.map((step) =>
              <Link data-ev-id="ev_5ca8114ce1"
              key={step.id}
              to={step.link}
              className={`flex items-center gap-3 p-3 rounded-[10px] transition-colors ${
              step.done ?
              'bg-surface-elevated/50' :
              'bg-surface-raised hover:bg-border'}`
              }>

                    <div data-ev-id="ev_e323c39eaa"
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step.done ?
                'bg-success text-white' :
                'border-2 border-border'}`
                }>

                      {step.done && <Check className="w-4 h-4" />}
                    </div>
                    <span data-ev-id="ev_2c598e462d"
                className={`flex-1 ${
                step.done ? 'text-text-tertiary line-through' : 'text-text'}`
                }>

                      {step.label}
                    </span>
                    {!step.done && <ArrowRight className="w-4 h-4 text-text-tertiary" />}
                  </Link>
              )}
              </div>
            </div>
          }

          {/* Activity Card (shows when checklist is complete) */}
          {allStepsComplete &&
          <div data-ev-id="activity" className="bg-card border border-border rounded-[16px] p-6">
              <div data-ev-id="ev_1b462ef7b8" className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 data-ev-id="ev_c3399242d4" className="text-lg font-display font-bold text-text">Recent activity</h3>
              </div>

              {recentNotifications.length === 0 ?
            <p data-ev-id="ev_bfc0c34c80" className="text-text-secondary text-sm">No recent notifications</p> :

            <div data-ev-id="ev_663f972622" className="flex flex-col gap-3">
                  {recentNotifications.slice(0, 4).map((notif) =>
              <div data-ev-id="ev_9ccea65d4d" key={notif.id} className="flex items-start gap-3">
                      <div data-ev-id="ev_4ac38c1ccd" className="w-8 h-8 rounded-[8px] bg-surface-raised flex items-center justify-center mt-0.5">
                        <Bell className="w-4 h-4 text-text-tertiary" />
                      </div>
                      <div data-ev-id="ev_59e4fc4ba0" className="flex-1 min-w-0">
                        <p data-ev-id="ev_d52981152e" className="text-sm font-medium text-text truncate">{notif.title}</p>
                        <p data-ev-id="ev_3fb399ea0a" className="text-xs text-text-tertiary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusPill
                  status={notif.status === 'sent' ? 'published' : 'draft'}
                  label={notif.status === 'sent' ? 'Sent' : 'Draft'} />

                    </div>
              )}
                </div>
            }
            </div>
          }
        </div>
      </div>
    </AppLayout>);

}
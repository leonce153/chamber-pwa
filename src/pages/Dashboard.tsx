import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApps, type AppWithAccess } from '@/hooks/useApps';
import type { Tables } from '@/integrations/supabase/helpers';
import { StatusPill } from '@/components/StatusPill';
import {
  Zap,
  Home,
  Smartphone,
  Bell,
  BarChart3,
  CreditCard,
  Crown,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Check,
  ArrowRight,
  MoreHorizontal,
  Send,
  Users,
  X } from
'lucide-react';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

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

export default function Dashboard() {
  const { apps, loading, deleteApp: deleteAppFromHook, refetch } = useApps();
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [showAppPickerForPush, setShowAppPickerForPush] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appFeatures, setAppFeatures] = useState<Record<string, number>>({}); // appId -> feature count
  const { user, role, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const canCreateApps = role === 'owner';
  const isAdmin = role === 'owner';
  const greeting = getGreeting();
  const firstName = getFirstName(user);

  // Fetch feature counts for checklist computation
  useEffect(() => {
    const fetchFeatures = async () => {
      if (!supabase || apps.length === 0) return;
      const appIds = apps.map((a) => a.id);
      const { data } = await supabase.
      from('app_features').
      select('app_id').
      in('app_id', appIds);

      const counts: Record<string, number> = {};
      (data ?? []).forEach((f) => {
        counts[f.app_id] = (counts[f.app_id] || 0) + 1;
      });
      setAppFeatures(counts);
    };
    fetchFeatures();
  }, [apps]);

  const filteredApps = apps.filter((app) =>
  app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute totals from real data
  const totalSubscribers = apps.reduce((sum, app) => sum + (app.total_installs ?? 0), 0);
  const totalVisits = apps.reduce((sum, app) => sum + (app.total_visits ?? 0), 0);
  const hasAnalyticsData = totalVisits > 0 || totalSubscribers > 0;

  // Get first app for checklist (most recent or first)
  const primaryApp = apps.length > 0 ? apps[0] : null;

  // Checklist computation for primary app
  const checklistSteps = useMemo(() => {
    if (!primaryApp) return [];
    const featureCount = appFeatures[primaryApp.id] || 0;
    const hasFeatures = featureCount > 0;
    const hasLogo = !!primaryApp.icon_url;
    const hasBrandColors = !!primaryApp.theme_color;
    const isPublished = primaryApp.status === 'active';
    // For push notification, we'll assume not sent if total_installs is 0
    const hasSentPush = (primaryApp.total_installs ?? 0) > 0;

    return [
    { id: 'create', label: 'Create your app', done: true, link: `/app/${primaryApp.id}/edit` },
    { id: 'features', label: 'Add features', done: hasFeatures, link: `/app/${primaryApp.id}/edit` },
    { id: 'brand', label: 'Add your logo and brand colors', done: hasLogo && hasBrandColors, link: `/app/${primaryApp.id}/edit` },
    { id: 'publish', label: 'Publish and share your install link', done: isPublished, link: `/app/${primaryApp.id}/edit` },
    { id: 'push', label: 'Send your first push notification', done: hasSentPush, link: `/app/${primaryApp.id}/notifications` }];

  }, [primaryApp, appFeatures]);

  const completedSteps = checklistSteps.filter((s) => s.done).length;
  const allStepsComplete = checklistSteps.length > 0 && completedSteps === checklistSteps.length;
  const nextStep = checklistSteps.find((s) => !s.done);
  const progressPercent = checklistSteps.length > 0 ? Math.round(completedSteps / checklistSteps.length * 100) : 0;

  const handleDeleteApp = async (id: string) => {
    await deleteAppFromHook(id);
    setShowDeleteConfirm(null);
    setOpenMenuId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleComposeNotification = () => {
    if (apps.length === 1) {
      navigate(`/app/${apps[0].id}/notifications`);
    } else if (apps.length > 1) {
      setShowAppPickerForPush(true);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home', active: true },
  { href: '/dashboard', icon: Smartphone, label: 'Apps', active: false },
  { href: apps[0] ? `/app/${apps[0].id}/notifications` : '/dashboard', icon: Bell, label: 'Notifications', active: false },
  { href: apps[0] ? `/app/${apps[0].id}/analytics` : '/dashboard', icon: BarChart3, label: 'Analytics', active: false },
  { href: '/dashboard', icon: CreditCard, label: 'Billing', active: false }];


  return (
    <div data-ev-id="ev_146becef1f" className="min-h-screen bg-background flex">
      {/* Sidebar - 248px */}
      <aside data-ev-id="ev_722f577445" className="w-[248px] bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div data-ev-id="ev_6e68d40f32" className="p-5 border-b border-border">
          <Link data-ev-id="ev_f975aacc56" to="/dashboard" className="flex items-center gap-2.5">
            <div data-ev-id="ev_f3e9dcb99d" className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span data-ev-id="ev_21be40d19f" className="text-lg font-display font-bold text-text">AppForge</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav data-ev-id="ev_9b00909ad3" className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) =>
          <Link data-ev-id="ev_a18d4d1788"
          key={item.label}
          to={item.href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] ${
          item.active ?
          'bg-primary text-white' :
          'text-text-secondary hover:text-text hover:bg-surface-elevated'}`
          }>

              <item.icon className="w-5 h-5" />
              <span data-ev-id="ev_80e7e2cc38" className="font-medium">{item.label}</span>
            </Link>
          )}

          {/* Platform section for admins */}
          {isAdmin &&
          <div data-ev-id="ev_43d2aefab0" className="mt-6">
              <p data-ev-id="ev_c5c8650d3b" className="px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Platform</p>
              <Link data-ev-id="ev_a76ee09880"
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] text-text-secondary hover:text-text hover:bg-surface-elevated">

                <Crown className="w-5 h-5" />
                <span data-ev-id="ev_6b267cd55b" className="font-medium">Admin</span>
              </Link>
            </div>
          }
        </nav>

        {/* User section */}
        <div data-ev-id="ev_4824d1238a" className="p-4 border-t border-border">
          <div data-ev-id="ev_73f9d651aa" className="flex items-center gap-3">
            <div data-ev-id="ev_2943a8a15e" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center text-[#C9CBFF] font-display font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div data-ev-id="ev_fdde07c092" className="flex-1 min-w-0">
              <p data-ev-id="ev_6e16e1bb01" className="text-sm font-medium text-text truncate">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p data-ev-id="ev_445f510556" className="text-xs text-text-tertiary truncate capitalize">{role?.replace('_', ' ') || 'User'}</p>
            </div>
            <button data-ev-id="ev_2b3cbab6c7"
            onClick={handleSignOut}
            className="p-2.5 text-text-tertiary hover:text-destructive hover:bg-[#DC262620] rounded-[10px] transition-colors"
            title="Sign out">

              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main data-ev-id="ev_2a690dc0a7" className="flex-1 overflow-auto">
        <div data-ev-id="ev_ddb9ca0f5d" className="p-8">
          {/* Header */}
          <div data-ev-id="ev_2734f7fc47" className="flex items-start justify-between mb-8">
            <div data-ev-id="ev_f3e72819b3">
              <h1 data-ev-id="ev_6d15b7c33d" className="text-[30px] font-display font-bold text-text tracking-tight mb-1">
                {greeting}, {firstName}
              </h1>
              <p data-ev-id="ev_1749e97d13" className="text-text-secondary">Here's what's happening with your apps today.</p>
            </div>
            <div data-ev-id="ev_70b6ec617c" className="flex items-center gap-3">
              {canCreateApps &&
              <button data-ev-id="ev_a31bbe77e0"
              onClick={() => setShowNewAppModal(true)}
              className="bg-surface-raised hover:bg-border-strong text-text font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] border border-border">

                  <Plus className="w-4 h-4" />
                  New app
                </button>
              }
              {apps.length > 0 &&
              <button data-ev-id="ev_a7364e4f0d"
              onClick={handleComposeNotification}
              className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">

                  <Send className="w-4 h-4" />
                  Compose notification
                </button>
              }
            </div>
          </div>

          {loading ?
          <div data-ev-id="ev_4acc81e3af" className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> :

          <>
              {/* Top row - 3 column grid */}
              <div data-ev-id="ev_527188f6bf" className="grid grid-cols-3 gap-6 mb-8">
                {/* Setup checklist - spans 2 columns (show only if not all complete and has an app) */}
                {primaryApp && !allStepsComplete &&
              <div data-ev-id="ev_e98bf6b809" className="col-span-2 bg-card border border-border rounded-[16px] p-6">
                    <div data-ev-id="ev_5a0b5dd54e" className="flex items-start justify-between mb-4">
                      <div data-ev-id="ev_bc30d7916c">
                        <h2 data-ev-id="ev_4654100a8c" className="text-[17px] font-display font-semibold text-text mb-1">
                          Get {primaryApp.name} live
                        </h2>
                        <p data-ev-id="ev_6051519d2b" className="text-text-secondary text-sm">
                          {completedSteps} of {checklistSteps.length} steps done · {progressPercent}%
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div data-ev-id="ev_5b4f090e33" className="h-2 bg-surface-raised rounded-full mb-6 overflow-hidden">
                      <div data-ev-id="ev_4668b227de"
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }} />

                    </div>
                    {/* Steps */}
                    <div data-ev-id="ev_7d296f6147" className="flex flex-col gap-3">
                      {checklistSteps.map((step, index) =>
                  <div data-ev-id="ev_599e43f86c" key={step.id} className="flex items-center gap-3">
                          <div data-ev-id="ev_0a1388d8ad" className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.done ?
                    'bg-success text-white' :
                    'bg-surface-raised text-text-tertiary'}`
                    }>
                            {step.done ?
                      <Check className="w-3.5 h-3.5" /> :

                      <span data-ev-id="ev_6893ae7243" className="text-xs font-medium">{index + 1}</span>
                      }
                          </div>
                          <span data-ev-id="ev_5c7463cff1" className={`flex-1 text-sm ${
                    step.done ? 'text-text-tertiary line-through' : 'text-text'}`
                    }>
                            {step.label}
                          </span>
                          {!step.done && step.id === nextStep?.id &&
                    <Link data-ev-id="ev_1d5c0000e9"
                    to={step.link}
                    className="text-link text-sm font-medium flex items-center gap-1 hover:underline">

                              Start <ArrowRight className="w-3 h-3" />
                            </Link>
                    }
                        </div>
                  )}
                    </div>
                  </div>
              }

                {/* If all steps complete, show stats in the 2-col space */}
                {primaryApp && allStepsComplete &&
              <div data-ev-id="ev_fd3cc07ab1" className="col-span-2 grid grid-cols-2 gap-6">
                    <div data-ev-id="ev_f04b9ff437" className="bg-card border border-border rounded-[16px] p-6">
                      <div data-ev-id="ev_c1d9695d88" className="w-12 h-12 rounded-[10px] bg-[#262A45] flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-[#C9CBFF]" />
                      </div>
                      <p data-ev-id="ev_ca0f5ff708" className="text-4xl font-display font-bold text-text mb-1 tracking-tight">{totalSubscribers}</p>
                      <p data-ev-id="ev_8621318d10" className="text-sm text-text-tertiary">Total subscribers</p>
                    </div>
                    <div data-ev-id="ev_169710ef79" className="bg-card border border-border rounded-[16px] p-6">
                      <div data-ev-id="ev_05e3d0e3ec" className="w-12 h-12 rounded-[10px] bg-[#262A45] flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 text-[#C9CBFF]" />
                      </div>
                      <p data-ev-id="ev_8c003ebed9" className="text-4xl font-display font-bold text-text mb-1 tracking-tight">{totalVisits}</p>
                      <p data-ev-id="ev_a8a5b429e6" className="text-sm text-text-tertiary">Total visits</p>
                    </div>
                  </div>
              }

                {/* No app yet - show empty state for checklist */}
                {!primaryApp &&
              <div data-ev-id="ev_04089f2f97" className="col-span-2 bg-card border border-border rounded-[16px] p-6 flex flex-col items-center justify-center text-center">
                    <Smartphone className="w-12 h-12 text-text-tertiary mb-4" />
                    <h3 data-ev-id="ev_4a16dd4a6c" className="text-[17px] font-display font-semibold text-text mb-2">Create your first app</h3>
                    <p data-ev-id="ev_92e06bd461" className="text-text-secondary text-sm mb-4">Get started by creating a new progressive web app.</p>
                    {canCreateApps &&
                <button data-ev-id="ev_77e2dfcce0"
                onClick={() => setShowNewAppModal(true)}
                className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">

                        <Plus className="w-4 h-4" />
                        Create app
                      </button>
                }
                  </div>
              }

                {/* Push notifications card - 1 column */}
                <div data-ev-id="ev_163bb15937" className="bg-card border border-border rounded-[16px] p-6">
                  <div data-ev-id="ev_3f64cdf925" className="flex items-center gap-3 mb-4">
                    <div data-ev-id="ev_fa6178ec04" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center">
                      <Bell className="w-5 h-5 text-[#C9CBFF]" />
                    </div>
                    <h3 data-ev-id="ev_a79ff38d1c" className="text-[17px] font-display font-semibold text-text">Push notifications</h3>
                  </div>
                  <div data-ev-id="ev_351698e5a3" className="flex gap-6 mb-4">
                    <div data-ev-id="ev_434d30f2f4">
                      <p data-ev-id="ev_8626bcb343" className="text-2xl font-display font-bold text-text">{totalSubscribers}</p>
                      <p data-ev-id="ev_d867ad5e8c" className="text-xs text-text-tertiary">Subscribers</p>
                    </div>
                    <div data-ev-id="ev_8007d0535f">
                      <p data-ev-id="ev_e925be7b71" className="text-2xl font-display font-bold text-text">0</p>
                      <p data-ev-id="ev_cc1d5da0c3" className="text-xs text-text-tertiary">Sent this month</p>
                    </div>
                  </div>
                  {totalSubscribers === 0 ?
                <p data-ev-id="ev_de44b40e54" className="text-text-secondary text-sm mb-4">
                      Subscribers will appear here once users install your app.
                    </p> :
                null}
                  <button data-ev-id="ev_b03bc15a19"
                onClick={handleComposeNotification}
                disabled={apps.length === 0}
                className="w-full bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 rounded-[10px] transition-colors min-h-[44px] border border-border disabled:opacity-50">

                    Draft a notification
                  </button>
                </div>
              </div>

              {/* Your apps section */}
              <div data-ev-id="ev_bd3c352afe" className="mb-8">
                <div data-ev-id="ev_42ab0c2191" className="flex items-center justify-between mb-4">
                  <h2 data-ev-id="ev_4a392cb758" className="text-[22px] font-display font-bold text-text tracking-tight">Your apps</h2>
                  {/* Search only if 4+ apps */}
                  {apps.length >= 4 &&
                <input data-ev-id="ev_bf12717387"
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input border border-border rounded-[10px] px-4 py-2 text-sm text-text placeholder:text-text-tertiary w-64 focus:outline-none focus:ring-2 focus:ring-primary" />

                }
                </div>

                <div data-ev-id="ev_5b4d4c7593" className="grid grid-cols-3 gap-6">
                  {filteredApps.map((app) =>
                <AppCard
                  key={app.id}
                  app={app}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onDelete={() => setShowDeleteConfirm(app.id)} />

                )}
                  {/* Create new app card */}
                  {canCreateApps &&
                <button data-ev-id="ev_ce872c7b44"
                onClick={() => setShowNewAppModal(true)}
                className="bg-transparent border-2 border-dashed border-border hover:border-border-strong rounded-[16px] p-6 flex flex-col items-center justify-center gap-3 transition-colors min-h-[240px] group">

                      <div data-ev-id="ev_06be5e6d02" className="w-12 h-12 rounded-[10px] bg-surface-raised group-hover:bg-border flex items-center justify-center transition-colors">
                        <Plus className="w-6 h-6 text-text-tertiary" />
                      </div>
                      <span data-ev-id="ev_2641176d0b" className="text-text-secondary font-medium">Create a new app</span>
                    </button>
                }
                </div>
              </div>

              {/* Activity / Analytics section */}
              <div data-ev-id="ev_c89f498e9e" className="bg-card border border-border rounded-[16px] p-6">
                <div data-ev-id="ev_d093027752" className="flex items-center justify-between mb-6">
                  <h2 data-ev-id="ev_cf6c541156" className="text-[17px] font-display font-semibold text-text">Activity</h2>
                  {hasAnalyticsData &&
                <div data-ev-id="ev_1ccc3d2d97" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1">
                      {(['7d', '30d', '90d', '1y'] as const).map((range) =>
                  <button data-ev-id="ev_dcebc13b24"
                  key={range}
                  className="px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors text-text-secondary hover:text-text">

                          {range}
                        </button>
                  )}
                    </div>
                }
                </div>
                {hasAnalyticsData ?
              <div data-ev-id="ev_2f7e254920" className="flex flex-col gap-4">
                    <div data-ev-id="ev_e5133b8c81" className="flex items-center justify-between">
                      <span data-ev-id="ev_188935858c" className="text-text-secondary">Total Visits</span>
                      <span data-ev-id="ev_fe10c9b6b4" className="text-text font-medium">{totalVisits}</span>
                    </div>
                    <div data-ev-id="ev_d41af45240" className="flex items-center justify-between">
                      <span data-ev-id="ev_11a17f0e21" className="text-text-secondary">Total Installs</span>
                      <span data-ev-id="ev_be520af75a" className="text-text font-medium">{totalSubscribers}</span>
                    </div>
                    <div data-ev-id="ev_1b008b1ec1" className="flex items-center justify-between">
                      <span data-ev-id="ev_8ad8ce304e" className="text-text-secondary">Conversion Rate</span>
                      <span data-ev-id="ev_41940f6e91" className="text-success font-medium">
                        {totalVisits > 0 ? (totalSubscribers / totalVisits * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div> :

              <div data-ev-id="ev_072cc7159f" className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                    <p data-ev-id="ev_2e5cb28a6e" className="text-text-secondary">
                      Visits, installs and notification opens will show here after your first app goes live.
                    </p>
                  </div>
              }
              </div>
            </>
          }
        </div>
      </main>

      {/* Modals */}
      {showNewAppModal &&
      <NewAppModal
        onClose={() => setShowNewAppModal(false)}
        onCreated={(app) => {
          setShowNewAppModal(false);
          refetch();
          navigate(`/app/${app.id}/edit`);
        }} />

      }

      {showAppPickerForPush && apps.length > 1 &&
      <AppPickerModal
        apps={apps}
        onClose={() => setShowAppPickerForPush(false)}
        onSelect={(appId) => {
          setShowAppPickerForPush(false);
          navigate(`/app/${appId}/notifications`);
        }} />

      }

      {showDeleteConfirm &&
      <DeleteConfirmModal
        appName={apps.find((a) => a.id === showDeleteConfirm)?.name || 'this app'}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => handleDeleteApp(showDeleteConfirm)} />

      }
    </div>);

}

// App Card Component
function AppCard({
  app,
  openMenuId,
  setOpenMenuId,
  onDelete





}: {app: AppWithAccess;openMenuId: string | null;setOpenMenuId: (id: string | null) => void;onDelete: () => void;}) {
  const canDelete = app.accessRole === 'owner' || app.accessRole === 'super_admin';
  const isMenuOpen = openMenuId === app.id;

  return (
    <div data-ev-id="ev_ebc790de83" className="bg-card border border-border rounded-[16px] overflow-hidden hover:border-border-strong transition-colors">
      {/* Preview area with brand colors */}
      <div data-ev-id="ev_dc77c9cc59"
      className="h-24 flex items-center justify-center relative"
      style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

        {app.icon_url ?
        <img data-ev-id="ev_9789b1da5b" src={app.icon_url} alt={app.name} className="w-14 h-14 rounded-[12px] object-cover" /> :

        <div data-ev-id="ev_4a502a73fb"
        className="w-14 h-14 rounded-[12px] flex items-center justify-center text-2xl font-display font-bold"
        style={{ backgroundColor: app.theme_color ?? '#B8956B', color: '#fff' }}>

            {app.name.charAt(0).toUpperCase()}
          </div>
        }
      </div>
      {/* Content */}
      <div data-ev-id="ev_888477b264" className="p-4">
        <h3 data-ev-id="ev_7adad9e7a3" className="text-[17px] font-display font-semibold text-text mb-1 truncate">{app.name}</h3>
        <p data-ev-id="ev_6f99008f62" className="text-text-secondary text-sm mb-3">
          {app.total_installs ?? 0} subscribers · Edited {new Date(app.updated_at).toLocaleDateString()}
        </p>
        <div data-ev-id="ev_7018f6c78a" className="flex items-center justify-between">
          <StatusPill status={app.status === 'active' ? 'live' : 'draft'} />
          <div data-ev-id="ev_1ceb8e77ec" className="flex items-center gap-2">
            <Link data-ev-id="ev_fda5ee96f2"
            to={`/app/${app.id}/edit`}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-[10px] transition-colors">

              Open editor
            </Link>
            {canDelete &&
            <div data-ev-id="ev_7cec39e339" className="relative">
                <button data-ev-id="ev_46adea9479"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : app.id);
              }}
              className="p-2 text-text-tertiary hover:text-text hover:bg-surface-raised rounded-[8px] transition-colors">

                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {isMenuOpen &&
              <div data-ev-id="ev_c1437f68db" className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-[10px] shadow-lg py-1 min-w-[140px] z-10">
                    <button data-ev-id="ev_9e28578077"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-[#DC262620] transition-colors flex items-center gap-2">

                      <Trash2 className="w-4 h-4" />
                      Delete app
                    </button>
                  </div>
              }
              </div>
            }
          </div>
        </div>
      </div>
    </div>);

}

// New App Modal (keeping existing logic)
function NewAppModal({
  onClose,
  onCreated



}: {onClose: () => void;onCreated: (app: App) => void;}) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const { user } = useAuth();

  const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
  const isLocalhost = window.location.hostname === 'localhost';
  const previewDomain = isLocalhost ? 'yourdomain.com' : baseDomain;

  const handleNameChange = (newName: string) => {
    setName(newName);
    const autoSubdomain = newName.
    toLowerCase().
    replace(/[^a-z0-9]+/g, '-').
    replace(/(^-|-$)/g, '').
    slice(0, 63);
    setSubdomain(autoSubdomain);
    validateSubdomain(autoSubdomain);
  };

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    validateSubdomain(cleaned);
  };

  const validateSubdomain = (value: string) => {
    if (!value) {setSubdomainError('');return true;}
    if (value.length < 3) {setSubdomainError('Must be at least 3 characters');return false;}
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) {
      setSubdomainError('Must start and end with a letter or number');
      return false;
    }
    if (value.includes('--')) {setSubdomainError('Cannot contain consecutive hyphens');return false;}
    setSubdomainError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !name.trim()) return;
    if (subdomain && !validateSubdomain(subdomain)) return;

    setLoading(true);
    setError('');

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data, error: createError } = await supabase.
    from('apps').
    insert({
      user_id: user.id,
      name: name.trim(),
      slug,
      subdomain: subdomain || null,
      status: 'draft'
    }).
    select().
    single();

    if (createError) {
      if (createError.message.includes('duplicate') || createError.message.includes('unique')) {
        setError('This subdomain is already taken. Please choose another.');
      } else {
        setError(createError.message);
      }
      setLoading(false);
      return;
    }

    if (data) {
      onCreated(data);
    }
  };

  return (
    <div data-ev-id="ev_9069709ae1" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_910b84e598" className="bg-card border border-border rounded-[16px] w-full max-w-md p-7">
        <h2 data-ev-id="ev_1cb2c3fe67" className="text-[22px] font-display font-bold text-text mb-5 tracking-tight">
          Create New App
        </h2>
        <form data-ev-id="ev_b187c5ddd9" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div data-ev-id="ev_65055e49fb">
            <label data-ev-id="ev_1c572da380" className="block text-sm font-medium text-text mb-1.5">Application Name</label>
            <input data-ev-id="ev_c8a32b7b80"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full bg-input border border-border rounded-[10px] px-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            placeholder="My Awesome App"
            maxLength={30}
            required
            autoFocus />

            <p data-ev-id="ev_3daf8dcb05" className="text-xs text-text-tertiary mt-1">Max 30 characters</p>
          </div>

          <div data-ev-id="ev_a8344424b4">
            <label data-ev-id="ev_21495d1661" className="block text-sm font-medium text-text mb-1.5">Subdomain</label>
            <div data-ev-id="ev_d99fbca180" className="flex items-center gap-2">
              <input data-ev-id="ev_2ca83f1363"
              type="text"
              value={subdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              className={`flex-1 bg-input border rounded-[10px] px-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] ${
              subdomainError ? 'border-destructive' : 'border-border'}`
              }
              placeholder="myapp"
              maxLength={63} />

              <span data-ev-id="ev_c7fff48c89" className="text-text-secondary text-sm">.{previewDomain}</span>
            </div>
            {subdomainError ?
            <p data-ev-id="ev_0d8c6a6d45" className="text-xs text-destructive mt-1">{subdomainError}</p> :
            subdomain ?
            <p data-ev-id="ev_617ae4dd06" className="text-xs text-success mt-1">
                Your app will be available at: {subdomain}.{previewDomain}
              </p> :

            <p data-ev-id="ev_e4e09a4976" className="text-xs text-text-tertiary mt-1">
                This is where users will access your PWA
              </p>
            }
          </div>

          {error &&
          <div data-ev-id="ev_238d4f2c01" className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {error}
            </div>
          }

          <div data-ev-id="ev_1b509db5c9" className="flex gap-3 mt-2">
            <button data-ev-id="ev_26e63c5827"
            type="button"
            onClick={onClose}
            className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">

              Cancel
            </button>
            <button data-ev-id="ev_5087138980"
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]">

              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create App'}
            </button>
          </div>
        </form>
      </div>
    </div>);

}

// App Picker Modal for notifications
function AppPickerModal({
  apps,
  onClose,
  onSelect




}: {apps: AppWithAccess[];onClose: () => void;onSelect: (appId: string) => void;}) {
  return (
    <div data-ev-id="ev_7d4c7e0cff" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_9113fdc627" className="bg-card border border-border rounded-[16px] w-full max-w-md p-7">
        <div data-ev-id="ev_b102da84b0" className="flex items-center justify-between mb-5">
          <h2 data-ev-id="ev_f6acd17356" className="text-[22px] font-display font-bold text-text tracking-tight">
            Select an app
          </h2>
          <button data-ev-id="ev_aba248ad91" onClick={onClose} className="p-2 text-text-tertiary hover:text-text rounded-[8px]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div data-ev-id="ev_fbba308224" className="flex flex-col gap-2">
          {apps.map((app) =>
          <button data-ev-id="ev_507b2cd93f"
          key={app.id}
          onClick={() => onSelect(app.id)}
          className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-surface-elevated transition-colors text-left">

              <div data-ev-id="ev_0d75b8d82a"
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-display font-bold"
            style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

                {app.name.charAt(0).toUpperCase()}
              </div>
              <div data-ev-id="ev_b4bb9affb1" className="flex-1">
                <p data-ev-id="ev_2e5ee8d6f0" className="font-medium text-text">{app.name}</p>
                <p data-ev-id="ev_431e204f84" className="text-xs text-text-tertiary">{app.total_installs ?? 0} subscribers</p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary" />
            </button>
          )}
        </div>
      </div>
    </div>);

}

// Delete Confirmation Modal
function DeleteConfirmModal({
  appName,
  onClose,
  onConfirm




}: {appName: string;onClose: () => void;onConfirm: () => void;}) {
  return (
    <div data-ev-id="ev_4a791852b6" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_98c9181728" className="bg-card border border-border rounded-[16px] w-full max-w-sm p-7">
        <h2 data-ev-id="ev_c2e78767a1" className="text-[22px] font-display font-bold text-text mb-3 tracking-tight">
          Delete app?
        </h2>
        <p data-ev-id="ev_578bc6f44f" className="text-text-secondary mb-6">
          Are you sure you want to delete <strong data-ev-id="ev_b770e93e8e" className="text-text">{appName}</strong>? This action cannot be undone.
        </p>
        <div data-ev-id="ev_26b9e4a07a" className="flex gap-3">
          <button data-ev-id="ev_a8a4c0d676"
          onClick={onClose}
          className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">

            Cancel
          </button>
          <button data-ev-id="ev_4af67538c2"
          onClick={onConfirm}
          className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px]">

            Delete
          </button>
        </div>
      </div>
    </div>);

}
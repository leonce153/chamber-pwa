import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { StatusPill } from '@/components/StatusPill';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Shield,
  Users,
  Smartphone,
  Bell,
  BarChart3,
  CreditCard,
  Search,
  Crown,
  Loader2,
  Calendar,
  UserCog,
  Pencil,
  User,
  ChevronDown,
  X,
  Plus,
  Trash2,
  Zap,
  Home,
  LogOut,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Eye,
  UserPlus } from
'lucide-react';

type App = Tables<'apps'>;
type Profile = Tables<'profiles'>;
type AppFeature = Tables<'app_features'>;

interface UserWithApps extends Profile {
  apps_count?: number;
  assigned_apps_count?: number;
}

interface AppWithDetails extends App {
  owner?: Profile;
  features?: AppFeature[];
}

type TabId = 'clients' | 'users' | 'access';

export default function Admin() {
  const navigate = useNavigate();
  const { isSuperAdmin, user: currentUser, role: currentUserRole, signOut } = useAuth();
  const [users, setUsers] = useState<UserWithApps[]>([]);
  const [apps, setApps] = useState<AppWithDetails[]>([]);
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('clients');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin || currentUserRole === 'owner') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, currentUserRole]);

  const fetchData = async () => {
    if (!supabase) return;

    const [usersResult, appsResult, collaboratorsResult, featuresResult] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('apps').select('*').order('created_at', { ascending: false }),
    supabase.from('app_collaborators').select('user_id, app_id'),
    supabase.from('app_features').select('*')]
    );

    const usersData = (usersResult.data ?? []) as Profile[];
    const appsData = appsResult.data ?? [];
    const featuresData = featuresResult.data ?? [];

    // Count owned apps and assigned apps per user
    const ownedAppsMap = new Map<string, number>();
    const assignedAppsMap = new Map<string, number>();

    appsData.forEach((app) => {
      ownedAppsMap.set(app.user_id, (ownedAppsMap.get(app.user_id) ?? 0) + 1);
    });

    (collaboratorsResult.data ?? []).forEach((collab) => {
      assignedAppsMap.set(collab.user_id, (assignedAppsMap.get(collab.user_id) ?? 0) + 1);
    });

    const usersWithCounts: UserWithApps[] = usersData.map((user) => ({
      ...user,
      apps_count: ownedAppsMap.get(user.id) ?? 0,
      assigned_apps_count: assignedAppsMap.get(user.id) ?? 0
    }));

    // Enrich apps with owner and features
    const appsWithDetails: AppWithDetails[] = appsData.map((app) => ({
      ...app,
      owner: usersData.find((u) => u.id === app.user_id),
      features: featuresData.filter((f) => f.app_id === app.id)
    }));

    setUsers(usersWithCounts);
    setApps(appsWithDetails);
    setFeatures(featuresData);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: 'owner' | 'editor') => {
    if (!supabase) return;
    const isOwnerRole = newRole === 'owner';
    await supabase.from('profiles').update({ role: newRole, is_owner: isOwnerRole }).eq('id', userId);
    setUsers(users.map((u) => u.id === userId ? { ...u, role: newRole, is_owner: isOwnerRole } : u));
  };

  const deleteApp = async (appId: string) => {
    if (!supabase) return;
    await supabase.from('apps').delete().eq('id', appId);
    setApps(apps.filter((a) => a.id !== appId));
    setShowDeleteConfirm(null);
    setOpenMenuId(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  // Filtered data based on search
  const filteredUsers = users.filter(
    (user) =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApps = apps.filter(
    (app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalClients = apps.length; // Apps = Clients in this context
  const liveApps = apps.filter((a) => a.status === 'active').length;
  const draftApps = apps.filter((a) => a.status !== 'active').length;
  const totalSubscribers = apps.reduce((sum, app) => sum + (app.total_installs ?? 0), 0);
  const totalTeam = users.length;
  const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const editorCount = users.filter((u) => u.role === 'editor').length;

  // Build team note
  const teamParts: string[] = [];
  if (superAdminCount > 0) teamParts.push(`${superAdminCount} super admin${superAdminCount > 1 ? 's' : ''}`);
  if (adminCount > 0) teamParts.push(`${adminCount} admin${adminCount > 1 ? 's' : ''}`);
  if (editorCount > 0) teamParts.push(`${editorCount} editor${editorCount > 1 ? 's' : ''}`);
  const teamNote = teamParts.join(' · ') || 'No roles assigned';

  const getRoleInfo = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super admin', color: 'bg-[#D9770620] text-[#FBBF24]', textColor: 'text-[#FBBF24]' };
      case 'admin':
        return { label: 'Admin', color: 'bg-[#262A45] text-[#A9ADFF]', textColor: 'text-[#A9ADFF]' };
      case 'editor':
        return { label: 'Editor', color: 'bg-[#1F8A5B20] text-[#34D399]', textColor: 'text-[#34D399]' };
      default:
        return { label: 'User', color: 'bg-[#262A33] text-[#C3C8D2]', textColor: 'text-[#C3C8D2]' };
    }
  };

  // Nav items - same as dashboard but with Admin active
  const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home', active: false },
  { href: '/dashboard', icon: Smartphone, label: 'Apps', active: false },
  { href: '/dashboard', icon: Bell, label: 'Notifications', active: false },
  { href: '/dashboard', icon: BarChart3, label: 'Analytics', active: false },
  { href: '/dashboard', icon: CreditCard, label: 'Billing', active: false }];


  if (!isSuperAdmin && currentUserRole !== 'owner') {
    return (
      <div data-ev-id="ev_99f62544d1" className="min-h-screen bg-background flex items-center justify-center">
        <div data-ev-id="ev_a8e783a811" className="text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 data-ev-id="ev_70ff5d2107" className="text-2xl font-bold text-text mb-2">Access Denied</h1>
          <p data-ev-id="ev_ac7cf4dce7" className="text-text-secondary mb-6">You don't have permission to access this page.</p>
          <Link data-ev-id="ev_41d11c30ff"
          to="/dashboard"
          className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-[10px] transition-colors min-h-[44px] inline-flex items-center">

            Back to Dashboard
          </Link>
        </div>
      </div>);

  }

  if (loading) {
    return (
      <div data-ev-id="ev_f0f4dd7728" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  const tabs: {id: TabId;label: string;}[] = [
  { id: 'clients', label: 'Clients' },
  { id: 'users', label: 'Users' },
  { id: 'access', label: 'App access' }];


  return (
    <div data-ev-id="ev_6fd91bdc6e" className="min-h-screen bg-background flex">
      {/* Sidebar - Same as Dashboard */}
      <aside data-ev-id="ev_e6f0e0d890" className="w-[248px] bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div data-ev-id="ev_8865240ced" className="p-5 border-b border-border">
          <Link data-ev-id="ev_98494e8591" to="/dashboard" className="flex items-center gap-2.5">
            <div data-ev-id="ev_b036260b14" className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span data-ev-id="ev_1fee54e09f" className="text-lg font-display font-bold text-text">AppForge</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav data-ev-id="ev_38f8c254cd" className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) =>
          <Link data-ev-id="ev_b330dffd6f"
          key={item.label}
          to={item.href}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] text-text-secondary hover:text-text hover:bg-surface-elevated">

              <item.icon className="w-5 h-5" />
              <span data-ev-id="ev_6220302624" className="font-medium">{item.label}</span>
            </Link>
          )}

          {/* Platform section - Admin active */}
          <div data-ev-id="ev_85dae55abe" className="mt-6">
            <p data-ev-id="ev_78190d19a7" className="px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Platform</p>
            <Link data-ev-id="ev_5a921fabf8"
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] bg-primary text-white">

              <Crown className="w-5 h-5" />
              <span data-ev-id="ev_e51a3aaf3f" className="font-medium">Admin</span>
            </Link>
          </div>
        </nav>

        {/* User section */}
        <div data-ev-id="ev_f93c0974b1" className="p-4 border-t border-border">
          <div data-ev-id="ev_f0382174d1" className="flex items-center gap-3">
            <div data-ev-id="ev_32bc0e67da" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center text-[#C9CBFF] font-display font-semibold">
              {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div data-ev-id="ev_cb5759ec4b" className="flex-1 min-w-0">
              <p data-ev-id="ev_9dce7c62b6" className="text-sm font-medium text-text truncate">
                {currentUser?.user_metadata?.full_name || 'User'}
              </p>
              <p data-ev-id="ev_6f81f6c46c" className="text-xs text-text-tertiary truncate capitalize">
                {currentUserRole?.replace('_', ' ') || 'User'}
              </p>
            </div>
            <button data-ev-id="ev_7b144fa295"
            onClick={handleSignOut}
            className="p-2.5 text-text-tertiary hover:text-destructive hover:bg-[#DC262620] rounded-[10px] transition-colors"
            title="Sign out">

              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main data-ev-id="ev_f56c0debf2" className="flex-1 overflow-auto">
        <div data-ev-id="ev_0778ea3e68" className="p-8">
          {/* Header */}
          <div data-ev-id="ev_b417988906" className="flex items-start justify-between mb-8">
            <div data-ev-id="ev_acf129d85c">
              <h1 data-ev-id="ev_2288478471" className="text-[30px] font-display font-bold text-text tracking-tight mb-1">Admin</h1>
              <p data-ev-id="ev_ba4398f706" className="text-text-secondary">Every client, app and user on the platform.</p>
            </div>
            <button data-ev-id="ev_799d53ff7f" className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">
              <Plus className="w-4 h-4" />
              Add client
            </button>
          </div>

          {/* Stats Row */}
          <div data-ev-id="ev_82837fad95" className="grid grid-cols-4 gap-6 mb-8">
            <div data-ev-id="ev_93eccce504" className="bg-card border border-border rounded-[16px] p-6">
              <div data-ev-id="ev_080b6efe1b" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-[#C9CBFF]" />
              </div>
              <p data-ev-id="ev_371756c8a8" className="text-3xl font-display font-bold text-text mb-1">{totalClients}</p>
              <p data-ev-id="ev_bccd82c7d6" className="text-sm text-text-tertiary">Clients</p>
            </div>
            <div data-ev-id="ev_891e846c32" className="bg-card border border-border rounded-[16px] p-6">
              <div data-ev-id="ev_a6a828615d" className="w-10 h-10 rounded-[10px] bg-[#1F8A5B20] flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-[#34D399]" />
              </div>
              <p data-ev-id="ev_32b63e9eb1" className="text-3xl font-display font-bold text-text mb-1">{apps.length}</p>
              <p data-ev-id="ev_242715cfb6" className="text-sm text-text-tertiary">
                Apps <span data-ev-id="ev_16c6313f76" className="text-text-secondary">· {liveApps} live · {draftApps} draft</span>
              </p>
            </div>
            <div data-ev-id="ev_371deb55e3" className="bg-card border border-border rounded-[16px] p-6">
              <div data-ev-id="ev_f854605e6d" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-[#C9CBFF]" />
              </div>
              <p data-ev-id="ev_20288a6f7a" className="text-3xl font-display font-bold text-text mb-1">{totalSubscribers}</p>
              <p data-ev-id="ev_e55d9eb4c1" className="text-sm text-text-tertiary">Push subscribers</p>
            </div>
            <div data-ev-id="ev_3e4477c7a2" className="bg-card border border-border rounded-[16px] p-6">
              <div data-ev-id="ev_33c398e6a2" className="w-10 h-10 rounded-[10px] bg-[#D9770620] flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[#FBBF24]" />
              </div>
              <p data-ev-id="ev_0ec3a77206" className="text-3xl font-display font-bold text-text mb-1">{totalTeam}</p>
              <p data-ev-id="ev_0a4d084ab9" className="text-sm text-text-tertiary">Team <span data-ev-id="ev_5ae6357d4e" className="text-text-secondary">· {teamNote}</span></p>
            </div>
          </div>

          {/* Tabs + Search */}
          <div data-ev-id="ev_eda0d60bdd" className="flex items-center justify-between mb-6">
            <div data-ev-id="ev_069b8d463d" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1">
              {tabs.map((tab) =>
              <button data-ev-id="ev_9ca44bd917"
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors min-h-[40px] ${
              activeTab === tab.id ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
              }>

                  {tab.label}
                </button>
              )}
            </div>
            <div data-ev-id="ev_0ab9c760ff" className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input data-ev-id="ev_96b51e51fd"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="bg-input border border-border rounded-[10px] pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-tertiary w-64 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]" />

            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'clients' &&
          <ClientsTab
            apps={filteredApps}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onDelete={(id) => setShowDeleteConfirm(id)} />

          }
          {activeTab === 'users' &&
          <UsersTab
            users={filteredUsers}
            currentUserId={currentUser?.id}
            onUpdateRole={updateUserRole}
            onAssignApps={(userId) => setShowAssignModal(userId)}
            getRoleInfo={getRoleInfo} />

          }
          {activeTab === 'access' &&
          <AppAccessTab
            users={users}
            apps={apps}
            onRefresh={fetchData} />

          }
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm &&
      <div data-ev-id="ev_622b76fb0f" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_6daa33c447" className="bg-card border border-border rounded-[16px] w-full max-w-sm p-7">
            <h2 data-ev-id="ev_dbb4fae039" className="text-[22px] font-display font-bold text-text mb-3 tracking-tight">Delete app?</h2>
            <p data-ev-id="ev_ae59a0b4df" className="text-text-secondary mb-6">
              Are you sure you want to delete <strong data-ev-id="ev_ad41f3eecf" className="text-text">{apps.find((a) => a.id === showDeleteConfirm)?.name}</strong>? This action cannot be undone.
            </p>
            <div data-ev-id="ev_a3418623e2" className="flex gap-3">
              <button data-ev-id="ev_9cf028388f"
            onClick={() => setShowDeleteConfirm(null)}
            className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">

                Cancel
              </button>
              <button data-ev-id="ev_31283b8d15"
            onClick={() => deleteApp(showDeleteConfirm)}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px]">

                Delete
              </button>
            </div>
          </div>
        </div>
      }

      {/* Assign Apps Modal */}
      {showAssignModal &&
      <AssignAppsModal
        userId={showAssignModal}
        userName={users.find((u) => u.id === showAssignModal)?.full_name || 'User'}
        apps={apps}
        onClose={() => setShowAssignModal(null)}
        onAssigned={fetchData} />

      }
    </div>);

}

// ============ CLIENTS TAB ============
function ClientsTab({
  apps,
  openMenuId,
  setOpenMenuId,
  onDelete





}: {apps: AppWithDetails[];openMenuId: string | null;setOpenMenuId: (id: string | null) => void;onDelete: (id: string) => void;}) {
  if (apps.length === 0) {
    return (
      <div data-ev-id="ev_f52ed7226a" className="bg-card border border-border rounded-[16px] p-12 text-center">
        <Smartphone className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 data-ev-id="ev_71517771e5" className="text-lg font-medium text-text mb-2">No clients yet</h3>
        <p data-ev-id="ev_28b90cefef" className="text-text-secondary mb-4">Apps created by users will appear here.</p>
      </div>);

  }

  return (
    <div data-ev-id="ev_f6e05eb25f" className="bg-card border border-border rounded-[16px] overflow-hidden">
      {/* Table Header */}
      <div data-ev-id="ev_d0b32ae6d7" className="grid grid-cols-[2fr_100px_100px_80px_1fr_120px_50px] gap-4 px-6 py-3 border-b border-border bg-surface-raised text-xs font-semibold text-text-tertiary uppercase tracking-wider">
        <span data-ev-id="ev_007db5c91c">Client / App</span>
        <span data-ev-id="ev_feadda2d9b">Status</span>
        <span data-ev-id="ev_7421c7280b">Subscribers</span>
        <span data-ev-id="ev_3cee1a5cc6">Sent (30d)</span>
        <span data-ev-id="ev_40d8b1bf66">Owner</span>
        <span data-ev-id="ev_ed0c07ea56">Last active</span>
        <span data-ev-id="ev_af3fd98220"></span>
      </div>
      {/* Table Rows */}
      <div data-ev-id="ev_0258d0ba0d" className="divide-y divide-border">
        {apps.map((app) => {
          const isMenuOpen = openMenuId === app.id;
          const featureNames = (app.features ?? []).slice(0, 3).map((f) => f.name).join(', ');
          const moreFeatures = (app.features ?? []).length > 3 ? ` +${(app.features ?? []).length - 3}` : '';

          return (
            <div data-ev-id="ev_8bc9510bc2"
            key={app.id}
            className="grid grid-cols-[2fr_100px_100px_80px_1fr_120px_50px] gap-4 px-6 py-4 items-center hover:bg-surface-elevated transition-colors">

              {/* Client / App */}
              <div data-ev-id="ev_b16342431b" className="flex items-center gap-3">
                {app.icon_url ?
                <img data-ev-id="ev_15b794948d" src={app.icon_url} alt={app.name} className="w-10 h-10 rounded-[10px] object-cover" /> :

                <div data-ev-id="ev_907cfa2cd1"
                className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-display font-bold"
                style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

                    {app.name.charAt(0).toUpperCase()}
                  </div>
                }
                <div data-ev-id="ev_9f11e75d9d">
                  <Link data-ev-id="ev_0445db1a1e"
                  to={`/app/${app.id}/edit`}
                  className="font-medium text-text hover:text-link transition-colors">

                    {app.name}
                  </Link>
                  {featureNames &&
                  <p data-ev-id="ev_b096b3f3ec" className="text-xs text-text-tertiary truncate max-w-[200px]">
                      {featureNames}{moreFeatures}
                    </p>
                  }
                </div>
              </div>

              {/* Status */}
              <div data-ev-id="ev_1182cf6e9e">
                <StatusPill status={app.status === 'active' ? 'live' : 'draft'} />
              </div>

              {/* Subscribers */}
              <span data-ev-id="ev_7836d8dd30" className="text-text">{app.total_installs ?? 0}</span>

              {/* Sent (30d) */}
              <span data-ev-id="ev_d9a5b23344" className="text-text-secondary">0</span>

              {/* Owner */}
              <div data-ev-id="ev_59e1d02a56" className="flex items-center gap-2">
                <div data-ev-id="ev_34777af22b" className="w-6 h-6 rounded-full bg-[#262A45] flex items-center justify-center text-xs text-[#C9CBFF] font-medium">
                  {app.owner?.full_name?.charAt(0) || app.owner?.email?.charAt(0) || '?'}
                </div>
                <span data-ev-id="ev_d2462d5f41" className="text-text-secondary text-sm truncate">
                  {app.owner?.full_name || app.owner?.email || 'Unknown'}
                </span>
              </div>

              {/* Last active */}
              <span data-ev-id="ev_a0a8abe502" className="text-text-secondary text-sm">
                {new Date(app.updated_at).toLocaleDateString()}
              </span>

              {/* Actions */}
              <div data-ev-id="ev_30eeb0a78b" className="relative">
                <button data-ev-id="ev_6d8d91efba"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : app.id);
                }}
                className="p-2 text-text-tertiary hover:text-text hover:bg-surface-raised rounded-[8px] transition-colors">

                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {isMenuOpen &&
                <div data-ev-id="ev_74cd332653" className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-[10px] shadow-lg py-1 min-w-[160px] z-10">
                    <Link data-ev-id="ev_7110428476"
                  to={`/app/${app.id}/edit`}
                  className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-raised transition-colors flex items-center gap-2">

                      <Edit className="w-4 h-4" />
                      Open editor
                    </Link>
                    <a data-ev-id="ev_d05e3e8fa2"
                  href={`/preview/${app.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface-raised transition-colors flex items-center gap-2">

                      <Eye className="w-4 h-4" />
                      View as client
                    </a>
                    <button data-ev-id="ev_ced5ce642c"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(app.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-[#DC262620] transition-colors flex items-center gap-2">

                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                }
              </div>
            </div>);

        })}
      </div>
    </div>);

}

// ============ USERS TAB ============
function UsersTab({
  users,
  currentUserId,
  onUpdateRole,
  onAssignApps,
  getRoleInfo






}: {users: UserWithApps[];currentUserId: string | undefined;onUpdateRole: (userId: string, role: UserRole) => void;onAssignApps: (userId: string) => void;getRoleInfo: (role: string | null) => {label: string;color: string;textColor: string;};}) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  if (users.length === 0) {
    return (
      <div data-ev-id="ev_8e60617107" className="bg-card border border-border rounded-[16px] p-12 text-center">
        <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 data-ev-id="ev_9810d07c14" className="text-lg font-medium text-text mb-2">No users yet</h3>
        <p data-ev-id="ev_fe89812cf0" className="text-text-secondary mb-4">Users will appear here when they sign up.</p>
        <button data-ev-id="ev_d1bf8a0af3" className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] inline-flex items-center gap-2 transition-colors min-h-[44px]">
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </div>);

  }

  return (
    <div data-ev-id="ev_c60aac117e" className="bg-card border border-border rounded-[16px] overflow-hidden">
      <div data-ev-id="ev_2c0b1dd654" className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 data-ev-id="ev_3226001315" className="text-[17px] font-display font-semibold text-text">All Users</h2>
        <button data-ev-id="ev_f5cc765329" className="bg-primary hover:bg-primary-hover text-white font-medium px-4 py-2 rounded-[10px] flex items-center gap-2 transition-colors text-sm min-h-[40px]">
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </div>
      <div data-ev-id="ev_68dec6d79a" className="divide-y divide-border">
        {users.map((user) => {
          const roleInfo = getRoleInfo(user.role);
          const isEditing = editingUserId === user.id;
          const isCurrentUser = user.id === currentUserId;

          return (
            <div data-ev-id="ev_6305122bd4" key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-elevated transition-colors">
              <div data-ev-id="ev_11b6e9c0e3" className="flex items-center gap-4">
                <div data-ev-id="ev_edab1d7f5c" className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${roleInfo.color}`}>
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                </div>
                <div data-ev-id="ev_5543355d04">
                  <div data-ev-id="ev_fd987c1f30" className="flex items-center gap-2">
                    <p data-ev-id="ev_127263f266" className="font-medium text-text">
                      {user.full_name || 'No name'}
                      {isCurrentUser && <span data-ev-id="ev_8e1eaf0e95" className="text-xs text-text-tertiary ml-1">(you)</span>}
                    </p>
                  </div>
                  <div data-ev-id="ev_90f2cb0a90" className="flex items-center gap-3 text-sm text-text-secondary">
                    <span data-ev-id="ev_866f3e82d4">{user.email}</span>
                    <span data-ev-id="ev_f0c18245fb">·</span>
                    <span data-ev-id="ev_2e1f4837b2">
                      Owns {user.apps_count ?? 0} apps · {user.assigned_apps_count ?? 0} assigned
                    </span>
                  </div>
                </div>
              </div>
              <div data-ev-id="ev_475082942e" className="flex items-center gap-3">
                <span data-ev-id="ev_d9a086a612" className="text-xs text-text-tertiary flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(user.created_at).toLocaleDateString()}
                </span>

                {/* Role Dropdown */}
                {isEditing ?
                <div data-ev-id="ev_f00a89c505" className="flex items-center gap-2">
                    <select data-ev-id="ev_6aacf3429c"
                  defaultValue={user.role ?? 'user'}
                  onChange={(e) => {
                    onUpdateRole(user.id, e.target.value as UserRole);
                    setEditingUserId(null);
                  }}
                  className="bg-input border border-border rounded-[10px] px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]">

                      <option data-ev-id="ev_7752ec70fc" value="user">User</option>
                      <option data-ev-id="ev_215a9e9c26" value="editor">Editor</option>
                      <option data-ev-id="ev_b41055b494" value="admin">Admin</option>
                      <option data-ev-id="ev_83bf0a25e4" value="super_admin">Super admin</option>
                    </select>
                    <button data-ev-id="ev_f4e7c43e5b"
                  onClick={() => setEditingUserId(null)}
                  className="p-2 text-text-tertiary hover:text-text transition-colors">

                      <X className="w-4 h-4" />
                    </button>
                  </div> :

                <button data-ev-id="ev_2299ebec2d"
                onClick={() => !isCurrentUser && setEditingUserId(user.id)}
                disabled={isCurrentUser}
                className={`flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm font-medium border transition-colors min-h-[40px] ${
                isCurrentUser ?
                'cursor-not-allowed opacity-60 border-border' :
                'border-border hover:border-border-strong cursor-pointer'} ${
                roleInfo.color}`}>

                    {roleInfo.label}
                    {!isCurrentUser && <ChevronDown className="w-4 h-4" />}
                  </button>
                }

                {user.role === 'admin' &&
                <button data-ev-id="ev_f3a558ebb9"
                onClick={() => onAssignApps(user.id)}
                className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-[10px] transition-colors"
                title="Assign apps to this admin">

                    <Plus className="w-4 h-4" />
                  </button>
                }
              </div>
            </div>);

        })}
      </div>
    </div>);

}

// ============ APP ACCESS TAB ============
function AppAccessTab({
  users,
  apps,
  onRefresh




}: {users: UserWithApps[];apps: AppWithDetails[];onRefresh: () => void;}) {
  const admins = users.filter((u) => u.role === 'admin');

  if (admins.length === 0) {
    return (
      <div data-ev-id="ev_a062374849" className="bg-card border border-border rounded-[16px] p-12 text-center">
        <UserCog className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 data-ev-id="ev_a93bdffb97" className="text-lg font-medium text-text mb-2">No admins yet</h3>
        <p data-ev-id="ev_73b3be79e6" className="text-text-secondary">Change a user's role to Admin in the Users tab to assign apps to them.</p>
      </div>);

  }

  return (
    <div data-ev-id="ev_3b26a46c55" className="bg-card border border-border rounded-[16px] overflow-hidden">
      <div data-ev-id="ev_23f7717e1a" className="px-6 py-4 border-b border-border">
        <h2 data-ev-id="ev_ea287b16c1" className="text-[17px] font-display font-semibold text-text">App Assignments</h2>
        <p data-ev-id="ev_eb73080d74" className="text-sm text-text-secondary">
          Assign apps to Admins so they can edit them. Use the Team tab in each app to add Editors.
        </p>
      </div>
      <div data-ev-id="ev_8ac90c2ca0" className="p-6 flex flex-col gap-4">
        {admins.map((admin) =>
        <AdminAssignmentCard key={admin.id} admin={admin} allApps={apps} onRefresh={onRefresh} />
        )}
      </div>
    </div>);

}

function AdminAssignmentCard({
  admin,
  allApps,
  onRefresh




}: {admin: UserWithApps;allApps: AppWithDetails[];onRefresh: () => void;}) {
  const [assignments, setAssignments] = useState<{app_id: string;role: string;}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('app_collaborators').select('app_id, role').eq('user_id', admin.id);
      setAssignments(data ?? []);
      setLoading(false);
    };
    fetchAssignments();
  }, [admin.id]);

  const removeAssignment = async (appId: string) => {
    if (!supabase) return;
    await supabase.from('app_collaborators').delete().eq('user_id', admin.id).eq('app_id', appId);
    setAssignments(assignments.filter((a) => a.app_id !== appId));
    onRefresh();
  };

  const assignedApps = allApps.filter((app) => assignments.some((a) => a.app_id === app.id));

  return (
    <div data-ev-id="ev_de85d5eff0" className="border border-border rounded-[16px] p-5">
      <div data-ev-id="ev_b46da2b968" className="flex items-center justify-between mb-4">
        <div data-ev-id="ev_cb56e0fce4" className="flex items-center gap-3">
          <div data-ev-id="ev_9719e588a7" className="w-10 h-10 rounded-full bg-[#262A45] flex items-center justify-center text-[#A9ADFF] font-semibold">
            {admin.full_name?.charAt(0) || admin.email?.charAt(0) || '?'}
          </div>
          <div data-ev-id="ev_3827ff8a9c">
            <p data-ev-id="ev_f3a9e109d7" className="font-medium text-text">{admin.full_name || 'No name'}</p>
            <p data-ev-id="ev_d15ac613b6" className="text-sm text-text-secondary">{admin.email}</p>
          </div>
        </div>
        <span data-ev-id="ev_225f427dbf" className="bg-[#262A45] text-[#A9ADFF] text-xs font-medium px-3 py-1 rounded-full">Admin</span>
      </div>

      {loading ?
      <div data-ev-id="ev_440e4b825a" className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
        </div> :
      assignedApps.length === 0 ?
      <p data-ev-id="ev_1e79d5d292" className="text-sm text-text-tertiary text-center py-4">No apps assigned yet</p> :

      <div data-ev-id="ev_3e0c72e98b" className="flex flex-wrap gap-2">
          {assignedApps.map((app) =>
        <div data-ev-id="ev_7752add38e"
        key={app.id}
        className="flex items-center gap-2 bg-surface-raised border border-border rounded-[10px] px-3 py-2">

              <div data-ev-id="ev_e602cbec7d"
          className="w-6 h-6 rounded-[6px] flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

                {app.name.charAt(0)}
              </div>
              <span data-ev-id="ev_a4dd8991a0" className="text-sm text-text">{app.name}</span>
              <button data-ev-id="ev_9f0ae21a06"
          onClick={() => removeAssignment(app.id)}
          className="text-text-tertiary hover:text-destructive transition-colors">

                <X className="w-3.5 h-3.5" />
              </button>
            </div>
        )}
        </div>
      }
    </div>);

}

function AssignAppsModal({
  userId,
  userName,
  apps,
  onClose,
  onAssigned






}: {userId: string;userName: string;apps: AppWithDetails[];onClose: () => void;onAssigned: () => void;}) {
  const [existingAssignments, setExistingAssignments] = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchExisting = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('app_collaborators').select('app_id').eq('user_id', userId);
      const ids = (data ?? []).map((d) => d.app_id);
      setExistingAssignments(ids);
      setSelectedApps(ids);
      setLoading(false);
    };
    fetchExisting();
  }, [userId]);

  const handleSave = async () => {
    if (!supabase || !user) return;
    setSaving(true);

    const toAdd = selectedApps.filter((id) => !existingAssignments.includes(id));
    const toRemove = existingAssignments.filter((id) => !selectedApps.includes(id));

    if (toRemove.length > 0) {
      await supabase.from('app_collaborators').delete().eq('user_id', userId).in('app_id', toRemove);
    }

    if (toAdd.length > 0) {
      const inserts = toAdd.map((appId) => ({
        app_id: appId,
        user_id: userId,
        role: 'admin',
        assigned_by: user.id
      }));
      await supabase.from('app_collaborators').insert(inserts);
    }

    onAssigned();
    onClose();
  };

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) => prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]);
  };

  const assignableApps = apps.filter((app) => app.user_id !== userId);

  return (
    <div data-ev-id="ev_23811a125d" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_5f52ac5435" className="bg-card border border-border rounded-[16px] w-full max-w-lg p-6">
        <div data-ev-id="ev_7fb8f6687b" className="flex items-center justify-between mb-4">
          <h2 data-ev-id="ev_de37c926ba" className="text-[22px] font-display font-bold text-text tracking-tight">Assign Apps to {userName}</h2>
          <button data-ev-id="ev_e7bbe2980b" onClick={onClose} className="p-2 text-text-tertiary hover:text-text rounded-[8px] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p data-ev-id="ev_130a46f4b2" className="text-sm text-text-secondary mb-4">
          Select apps that this Admin should be able to edit. They will have full edit access but cannot delete apps or manage other Admins.
        </p>

        {loading ?
        <div data-ev-id="ev_63a3eab442" className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div> :

        <div data-ev-id="ev_f28b315c76" className="max-h-80 overflow-y-auto border border-border rounded-[12px] mb-4">
            {assignableApps.length === 0 ?
          <div data-ev-id="ev_070cabc864" className="text-center py-8 text-text-secondary">
                <p data-ev-id="ev_3a0d56fe4d">No apps available to assign</p>
              </div> :

          assignableApps.map((app) =>
          <button data-ev-id="ev_662943ee74"
          key={app.id}
          onClick={() => toggleApp(app.id)}
          className={`w-full flex items-center gap-3 p-4 text-left hover:bg-surface-elevated transition-colors border-b border-border last:border-b-0 ${
          selectedApps.includes(app.id) ? 'bg-primary/10' : ''}`
          }>

                  <div data-ev-id="ev_577b8e16d3"
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div data-ev-id="ev_39a5613c4a" className="flex-1 min-w-0">
                    <p data-ev-id="ev_8335edf985" className="font-medium text-text truncate">{app.name}</p>
                    <p data-ev-id="ev_f19c57b321" className="text-sm text-text-tertiary truncate">/{app.slug}</p>
                  </div>
                  {selectedApps.includes(app.id) &&
            <div data-ev-id="ev_78551b2e85" className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span data-ev-id="ev_db1f57bca7" className="text-white text-xs">✓</span>
                    </div>
            }
                </button>
          )
          }
          </div>
        }

        <div data-ev-id="ev_20911d83bc" className="flex gap-3">
          <button data-ev-id="ev_89d290f075"
          onClick={onClose}
          className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">

            Cancel
          </button>
          <button data-ev-id="ev_b2043b14f6"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]">

            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>);

}
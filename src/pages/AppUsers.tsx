import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Users,
  Search,
  ArrowLeft,
  Loader2,
  Smartphone,
  Apple,
  Globe,
  Bell,
  BellOff,
  Clock } from
'lucide-react';

type App = Tables<'apps'>;
type AppUser = Tables<'app_users'>;

export default function AppUsersPage() {
  const { appId } = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const fetchData = async () => {
    if (!supabase || !appId) return;

    const [appResult, usersResult] = await Promise.all([
    supabase.from('apps').select('*').eq('id', appId).single(),
    supabase.from('app_users').select('*').eq('app_id', appId).order('created_at', { ascending: false })]
    );

    if (appResult.data) setApp(appResult.data);
    setUsers(usersResult.data ?? []);
    setLoading(false);
  };

  const filteredUsers = users.filter((user) =>
  user.device_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  user.platform?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const iosUsers = users.filter((u) => u.platform === 'ios').length;
  const androidUsers = users.filter((u) => u.platform === 'android').length;
  const webUsers = users.filter((u) => u.platform === 'web').length;
  const pushEnabled = users.filter((u) => u.push_enabled).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div data-ev-id="ev_69d3262608" className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>);

  }

  return (
    <DashboardLayout appName={app?.name} showBackToDashboard>
      <div data-ev-id="ev_cf88bbbb27" className="p-8">
        {/* Header */}
        <div data-ev-id="ev_b1e14fdd5a" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_0cf20bc0ac">
            <Link
              to={`/app/${appId}/edit`}
              className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm mb-2">

              <ArrowLeft className="w-4 h-4" />
              Back to Editor
            </Link>
            <h1 data-ev-id="ev_991841be32" className="text-2xl font-bold text-text">App Users</h1>
            <p data-ev-id="ev_42e6f33169" className="text-muted mt-1">Manage users who have installed your app</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div data-ev-id="ev_bdb1aa3477" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div data-ev-id="ev_8e4afd3ae8" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_2ac62d3cb4" className="flex items-center gap-4">
              <div data-ev-id="ev_3d0ec6f500" className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div data-ev-id="ev_12996f1450">
                <p data-ev-id="ev_9acc65c178" className="text-2xl font-bold text-text">{users.length}</p>
                <p data-ev-id="ev_46d6adf947" className="text-sm text-muted">Total Users</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_f3a5dd440c" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_57ba0573b1" className="flex items-center gap-4">
              <div data-ev-id="ev_0ff34d40bb" className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                <Apple className="w-6 h-6 text-secondary" />
              </div>
              <div data-ev-id="ev_f89d52e6f6">
                <p data-ev-id="ev_e83ff579e8" className="text-2xl font-bold text-text">{iosUsers}</p>
                <p data-ev-id="ev_20cb17950e" className="text-sm text-muted">iOS Users</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_96ca39064b" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_677e1f7117" className="flex items-center gap-4">
              <div data-ev-id="ev_afe76f9e01" className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-success" />
              </div>
              <div data-ev-id="ev_1ffcfefbae">
                <p data-ev-id="ev_816016e1fc" className="text-2xl font-bold text-text">{androidUsers}</p>
                <p data-ev-id="ev_bd32cd3583" className="text-sm text-muted">Android Users</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_1b8901cb60" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_a8744a9b8f" className="flex items-center gap-4">
              <div data-ev-id="ev_b75583b40f" className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-warning" />
              </div>
              <div data-ev-id="ev_89eb37e970">
                <p data-ev-id="ev_98e06b7fe0" className="text-2xl font-bold text-text">{pushEnabled}</p>
                <p data-ev-id="ev_09bc623fe8" className="text-sm text-muted">Push Enabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div data-ev-id="ev_f9909d93e0" className="bg-surface border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_8b21a7a84b" className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div data-ev-id="ev_3e9d9909fa" className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_fb26335f67" className="text-lg font-semibold text-text">All Users</h2>
              <span data-ev-id="ev_62f38b8e27" className="bg-primary/20 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
                {users.length}
              </span>
            </div>
            <div data-ev-id="ev_b652e23897" className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input data-ev-id="ev_39a5008225"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text placeholder:text-muted w-64 focus:outline-none focus:ring-2 focus:ring-primary" />

            </div>
          </div>

          {users.length === 0 ?
          <div data-ev-id="ev_f96a306388" className="p-12 text-center">
              <Users className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 data-ev-id="ev_25d5bff255" className="text-lg font-medium text-text mb-2">No users yet</h3>
              <p data-ev-id="ev_85748c56e3" className="text-muted">Users will appear here once they install your app</p>
            </div> :

          <div data-ev-id="ev_a24f5bf46e" className="divide-y divide-border">
              {filteredUsers.map((user) =>
            <div data-ev-id="ev_3da31882e1" key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-elevated transition-colors">
                  <div data-ev-id="ev_c95b88c5ab" className="flex items-center gap-4">
                    <div data-ev-id="ev_a271c3b23c" className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                user.platform === 'ios' ?
                'bg-secondary/20' :
                user.platform === 'android' ?
                'bg-success/20' :
                'bg-primary/20'}`
                }>
                      {user.platform === 'ios' ?
                  <Apple className="w-5 h-5 text-secondary" /> :
                  user.platform === 'android' ?
                  <Smartphone className="w-5 h-5 text-success" /> :

                  <Globe className="w-5 h-5 text-primary" />
                  }
                    </div>
                    <div data-ev-id="ev_5976e386ec">
                      <p data-ev-id="ev_02e8f11f2d" className="font-medium text-text">
                        {user.device_id?.slice(0, 12) || 'Unknown Device'}...
                      </p>
                      <p data-ev-id="ev_c7f81fc0b8" className="text-sm text-muted capitalize">{user.platform || 'Unknown'}</p>
                    </div>
                  </div>
                  <div data-ev-id="ev_0c9f1e3a4d" className="flex items-center gap-6">
                    <div data-ev-id="ev_f4b5638c73" className="flex items-center gap-2">
                      {user.push_enabled ?
                  <Bell className="w-4 h-4 text-success" /> :

                  <BellOff className="w-4 h-4 text-muted" />
                  }
                      <span data-ev-id="ev_4477140ee7" className="text-sm text-muted">
                        {user.push_enabled ? 'Notifications on' : 'Notifications off'}
                      </span>
                    </div>
                    <div data-ev-id="ev_ccc958420d" className="flex items-center gap-2 text-muted">
                      <Clock className="w-4 h-4" />
                      <span data-ev-id="ev_0599be3b2b" className="text-sm">
                        {user.last_visit ?
                    new Date(user.last_visit).toLocaleDateString() :
                    'Never'
                    }
                      </span>
                    </div>
                  </div>
                </div>
            )}
            </div>
          }
        </div>
      </div>
    </DashboardLayout>);

}
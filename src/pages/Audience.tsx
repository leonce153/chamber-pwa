import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/hooks/useApp';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Loader2,
  Users,
  TrendingUp,
  Eye,
  Smartphone,
  Calendar,
  Globe,
  Clock } from
'lucide-react';

type AppAnalytics = Tables<'app_analytics'>;
type AppUser = Tables<'app_users'>;

export default function Audience() {
  const { app, loading: appLoading } = useApp();
  const [analytics, setAnalytics] = useState<AppAnalytics[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !app) return;
      setLoading(true);

      const [analyticsResult, usersResult] = await Promise.all([
      supabase.
      from('app_analytics').
      select('*').
      eq('app_id', app.id).
      order('date', { ascending: false }).
      limit(30),
      supabase.
      from('app_users').
      select('*').
      eq('app_id', app.id).
      order('created_at', { ascending: false }).
      limit(100)]
      );

      setAnalytics(analyticsResult.data ?? []);
      setUsers(usersResult.data ?? []);
      setLoading(false);
    };

    if (app) {
      fetchData();
    }
  }, [app]);

  // Compute stats
  const totalSubscribers = app?.total_installs ?? 0;
  const totalVisits = app?.total_visits ?? 0;
  const last7DaysVisits = analytics.slice(0, 7).reduce((sum, a) => sum + (a.visits ?? 0), 0);
  const last7DaysInstalls = analytics.slice(0, 7).reduce((sum, a) => sum + (a.installs ?? 0), 0);

  if (appLoading || loading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_0169722fa8" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  return (
    <AppLayout>
      <div data-ev-id="audience_page" className="p-8">
        {/* Header */}
        <div data-ev-id="ev_381c5707bb" className="mb-8">
          <h1 data-ev-id="ev_d64737b8b7" className="text-[28px] font-display font-bold text-text tracking-tight">Audience</h1>
          <p data-ev-id="ev_6d5d393e1a" className="text-text-secondary mt-1">Track your app's growth and user engagement</p>
        </div>

        {/* Stats Row */}
        <div data-ev-id="ev_497f32f184" className="grid grid-cols-4 gap-6 mb-8">
          <div data-ev-id="ev_aafa73d25f" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_bf38106ba7" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_3c51a6a240" className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span data-ev-id="ev_3509b43910" className="text-text-secondary text-sm">Total subscribers</span>
            </div>
            <p data-ev-id="ev_3584d183de" className="text-[32px] font-display font-bold text-text">{totalSubscribers.toLocaleString()}</p>
          </div>

          <div data-ev-id="ev_9bc006320e" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_4cef2017fb" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_2e8e39d833" className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-accent" />
              </div>
              <span data-ev-id="ev_bed69bd4f3" className="text-text-secondary text-sm">Total visits</span>
            </div>
            <p data-ev-id="ev_9c81f531b3" className="text-[32px] font-display font-bold text-text">{totalVisits.toLocaleString()}</p>
          </div>

          <div data-ev-id="ev_1d34b7856b" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_038fc5f4a9" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_7d8792a1a1" className="w-10 h-10 rounded-[10px] bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <span data-ev-id="ev_d688f3bd26" className="text-text-secondary text-sm">Last 7 days visits</span>
            </div>
            <p data-ev-id="ev_f7e8c4638b" className="text-[32px] font-display font-bold text-text">{last7DaysVisits.toLocaleString()}</p>
          </div>

          <div data-ev-id="ev_0d0108ac9e" className="bg-card border border-border rounded-[16px] p-6">
            <div data-ev-id="ev_8e8539be7d" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_8b966ba6fa" className="w-10 h-10 rounded-[10px] bg-warning/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-warning" />
              </div>
              <span data-ev-id="ev_b263436562" className="text-text-secondary text-sm">New installs (7d)</span>
            </div>
            <p data-ev-id="ev_1a70d9f2aa" className="text-[32px] font-display font-bold text-text">{last7DaysInstalls.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div data-ev-id="ev_8a2118da76" className="flex gap-2 mb-6">
          <button data-ev-id="ev_52b1fecb4f"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-[10px] font-medium transition-colors min-h-[44px] ${
          activeTab === 'overview' ?
          'bg-primary text-white' :
          'bg-surface-raised text-text-secondary hover:text-text'}`
          }>

            Overview
          </button>
          <button data-ev-id="ev_94ebfdc179"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-[10px] font-medium transition-colors min-h-[44px] ${
          activeTab === 'users' ?
          'bg-primary text-white' :
          'bg-surface-raised text-text-secondary hover:text-text'}`
          }>

            Users ({users.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' ?
        <div data-ev-id="ev_7dc6b1caed" className="bg-card border border-border rounded-[16px] overflow-hidden">
            <div data-ev-id="ev_7e131acc87" className="p-5 border-b border-border">
              <h2 data-ev-id="ev_d12d23ee3b" className="text-lg font-display font-bold text-text">Daily activity</h2>
            </div>
            {analytics.length === 0 ?
          <div data-ev-id="ev_fd537b46e3" className="p-12 text-center">
                <TrendingUp className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p data-ev-id="ev_6160a10ca4" className="text-text-secondary">No analytics data yet</p>
                <p data-ev-id="ev_422a2046f4" className="text-text-tertiary text-sm mt-1">Data will appear here once users start visiting your app</p>
              </div> :

          <div data-ev-id="ev_b2b9097399" className="divide-y divide-border">
                {analytics.map((day) =>
            <div data-ev-id="ev_297f784c13" key={day.id} className="p-5 flex items-center gap-6">
                    <div data-ev-id="ev_410c95cad3" className="w-24">
                      <p data-ev-id="ev_adb2e3aaea" className="text-sm text-text-secondary flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div data-ev-id="ev_451b15b117" className="flex-1 grid grid-cols-3 gap-4">
                      <div data-ev-id="ev_3cd6f49d5e">
                        <p data-ev-id="ev_25e211d07d" className="text-xs text-text-tertiary">Visits</p>
                        <p data-ev-id="ev_ea2643d7f3" className="text-lg font-semibold text-text">{day.visits ?? 0}</p>
                      </div>
                      <div data-ev-id="ev_6f4186176f">
                        <p data-ev-id="ev_319fb4a025" className="text-xs text-text-tertiary">Installs</p>
                        <p data-ev-id="ev_6bc7906e02" className="text-lg font-semibold text-text">{day.installs ?? 0}</p>
                      </div>
                      <div data-ev-id="ev_1410851e30">
                        <p data-ev-id="ev_64ac34a082" className="text-xs text-text-tertiary">iOS / Android</p>
                        <p data-ev-id="ev_edf4a4ce0a" className="text-lg font-semibold text-text">
                          {day.ios_installs ?? 0} / {day.android_installs ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
            )}
              </div>
          }
          </div> :

        <div data-ev-id="ev_2848e62cd4" className="bg-card border border-border rounded-[16px] overflow-hidden">
            <div data-ev-id="ev_7b173ffaab" className="p-5 border-b border-border">
              <h2 data-ev-id="ev_f31a40e04c" className="text-lg font-display font-bold text-text">Subscribed users</h2>
            </div>
            {users.length === 0 ?
          <div data-ev-id="ev_5b7c5d87c7" className="p-12 text-center">
                <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p data-ev-id="ev_37f162778d" className="text-text-secondary">No subscribers yet</p>
                <p data-ev-id="ev_7eb77d1fa2" className="text-text-tertiary text-sm mt-1">Users who install your app and enable notifications will appear here</p>
              </div> :

          <div data-ev-id="ev_47e39a0c00" className="divide-y divide-border">
                {users.map((user) =>
            <div data-ev-id="ev_ee656627ca" key={user.id} className="p-5 flex items-center gap-4">
                    <div data-ev-id="ev_31685c4c69" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center text-[#C9CBFF] font-display font-semibold">
                      {(user.platform || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div data-ev-id="ev_3cff8e9584" className="flex-1">
                      <p data-ev-id="ev_dd797f31a5" className="font-medium text-text flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-text-tertiary" />
                        {user.platform || 'Unknown platform'}
                      </p>
                      <p data-ev-id="ev_8e4f640168" className="text-sm text-text-secondary flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        {user.device_id ? `Device: ${user.device_id.slice(0, 8)}...` : 'Unknown device'}
                      </p>
                    </div>
                    <div data-ev-id="ev_808fbbe159" className="text-right">
                      <p data-ev-id="ev_70cda7b905" className="text-xs text-text-tertiary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
            )}
              </div>
          }
          </div>
        }
      </div>
    </AppLayout>);

}
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Download,
  ArrowLeft,
  Loader2,
  Calendar,
  Smartphone } from
'lucide-react';

type App = Tables<'apps'>;
type AppAnalytics = Tables<'app_analytics'>;

export default function AppAnalyticsPage() {
  const { appId } = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [analytics, setAnalytics] = useState<AppAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, dateRange]);

  const fetchData = async () => {
    if (!supabase || !appId) return;

    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[dateRange];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [appResult, analyticsResult] = await Promise.all([
    supabase.from('apps').select('*').eq('id', appId).single(),
    supabase.
    from('app_analytics').
    select('*').
    eq('app_id', appId).
    gte('date', startDate.toISOString().split('T')[0]).
    order('date', { ascending: true })]
    );

    if (appResult.data) setApp(appResult.data);
    setAnalytics(analyticsResult.data ?? []);
    setLoading(false);
  };

  const totalVisits = analytics.reduce((sum, a) => sum + (a.visits ?? 0), 0);
  const totalInstalls = analytics.reduce((sum, a) => sum + (a.installs ?? 0), 0);
  const iosInstalls = analytics.reduce((sum, a) => sum + (a.ios_installs ?? 0), 0);
  const androidInstalls = analytics.reduce((sum, a) => sum + (a.android_installs ?? 0), 0);

  // Generate chart data for empty state
  const chartData = analytics.length > 0 ? analytics : Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    visits: 0,
    installs: 0
  }));

  const maxVisits = Math.max(...chartData.map((d) => d.visits ?? 0), 1);

  if (loading) {
    return (
      <DashboardLayout>
        <div data-ev-id="ev_4a4b85c318" className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>);

  }

  return (
    <DashboardLayout appName={app?.name} showBackToDashboard>
      <div data-ev-id="ev_2a0cf572d2" className="p-8">
        {/* Header */}
        <div data-ev-id="ev_fa229a27a7" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_4d573ce4fe">
            <Link
              to={`/app/${appId}/edit`}
              className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm mb-2">

              <ArrowLeft className="w-4 h-4" />
              Back to Editor
            </Link>
            <h1 data-ev-id="ev_fa4b4dae09" className="text-2xl font-bold text-text">App Analytics</h1>
            <p data-ev-id="ev_b57f8a243b" className="text-muted mt-1">Track your app's performance and user engagement</p>
          </div>
          <div data-ev-id="ev_a3b0e61138" className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) =>
            <button data-ev-id="ev_382d2331e2"
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            dateRange === range ?
            'bg-primary text-white' :
            'text-muted hover:text-text'}`
            }>

                {range}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div data-ev-id="ev_62c01f943b" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div data-ev-id="ev_6c414d32ed" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_b43597b3a7" className="flex items-center gap-4">
              <div data-ev-id="ev_26a71092a3" className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <div data-ev-id="ev_8ee5803375">
                <p data-ev-id="ev_7a91f7010e" className="text-2xl font-bold text-text">{totalVisits}</p>
                <p data-ev-id="ev_31eceb656f" className="text-sm text-muted">Total Visits</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_8c513fa371" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_e4082e831c" className="flex items-center gap-4">
              <div data-ev-id="ev_e958863619" className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-success" />
              </div>
              <div data-ev-id="ev_f8cc127791">
                <p data-ev-id="ev_cb3402170e" className="text-2xl font-bold text-text">{totalInstalls}</p>
                <p data-ev-id="ev_aceacea839" className="text-sm text-muted">Total Installs</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_1e62f2e40b" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_f6478dd58f" className="flex items-center gap-4">
              <div data-ev-id="ev_5e966ca892" className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-secondary" />
              </div>
              <div data-ev-id="ev_b7369392ec">
                <p data-ev-id="ev_8e2d96b11f" className="text-2xl font-bold text-text">{iosInstalls}</p>
                <p data-ev-id="ev_f2b90da2df" className="text-sm text-muted">iOS Installs</p>
              </div>
            </div>
          </div>
          <div data-ev-id="ev_304b826c7c" className="bg-surface border border-border rounded-xl p-6">
            <div data-ev-id="ev_d7a218274e" className="flex items-center gap-4">
              <div data-ev-id="ev_1e8105aaa6" className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-success" />
              </div>
              <div data-ev-id="ev_8a3da0db06">
                <p data-ev-id="ev_ad170fd893" className="text-2xl font-bold text-text">{androidInstalls}</p>
                <p data-ev-id="ev_468d21d386" className="text-sm text-muted">Android Installs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div data-ev-id="ev_e177350823" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visits Chart */}
          <div data-ev-id="ev_6ff312c737" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_bc6d32b4f0" className="px-6 py-4 border-b border-border flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 data-ev-id="ev_5e0ec03ecf" className="text-lg font-semibold text-text">Daily Visits</h2>
            </div>
            <div data-ev-id="ev_7620ff508a" className="p-6">
              <div data-ev-id="ev_86b5cc6a98" className="h-64 flex items-end gap-1">
                {chartData.slice(-14).map((data, i) =>
                <div data-ev-id="ev_d832b6aa31"
                key={i}
                className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors"
                style={{ height: `${Math.max((data.visits ?? 0) / maxVisits * 100, 5)}%` }}
                title={`${data.date}: ${data.visits ?? 0} visits`} />

                )}
              </div>
              <div data-ev-id="ev_e838bc55d8" className="flex justify-between mt-2 text-xs text-muted">
                <span data-ev-id="ev_9a6cb2e623">
                  {new Date(chartData[chartData.length - 14]?.date ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span data-ev-id="ev_986a7f1e12">
                  {new Date(chartData[chartData.length - 1]?.date ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Platform Distribution */}
          <div data-ev-id="ev_6735fd4af7" className="bg-surface border border-border rounded-xl overflow-hidden">
            <div data-ev-id="ev_a7346c5505" className="px-6 py-4 border-b border-border flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <h2 data-ev-id="ev_a7c4f357ba" className="text-lg font-semibold text-text">Platform Distribution</h2>
            </div>
            <div data-ev-id="ev_0654b3759c" className="p-6">
              <div data-ev-id="ev_8db6cbec24" className="flex items-center justify-center gap-8">
                <div data-ev-id="ev_6b2485c23b" className="relative w-40 h-40">
                  <svg data-ev-id="ev_f07e9a53d5" className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle data-ev-id="ev_10253873dd"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-surface-elevated" />

                    {totalInstalls > 0 &&
                    <>
                        <circle data-ev-id="ev_bed1b56470"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={`${iosInstalls / totalInstalls * 251.2} 251.2`}
                      className="text-secondary" />

                        <circle data-ev-id="ev_b2541bbdbb"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={`${androidInstalls / totalInstalls * 251.2} 251.2`}
                      strokeDashoffset={`${-(iosInstalls / totalInstalls) * 251.2}`}
                      className="text-success" />

                      </>
                    }
                  </svg>
                  <div data-ev-id="ev_844ca2cf69" className="absolute inset-0 flex items-center justify-center">
                    <span data-ev-id="ev_1fd071b0a9" className="text-2xl font-bold text-text">{totalInstalls}</span>
                  </div>
                </div>
                <div data-ev-id="ev_24effb3e3b" className="flex flex-col gap-4">
                  <div data-ev-id="ev_4f4b923f8f" className="flex items-center gap-3">
                    <div data-ev-id="ev_c3838d796a" className="w-4 h-4 rounded-full bg-secondary" />
                    <div data-ev-id="ev_f7e8d7bb4d">
                      <p data-ev-id="ev_2fede37781" className="text-text font-medium">iOS</p>
                      <p data-ev-id="ev_26bc9d130a" className="text-sm text-muted">{iosInstalls} installs</p>
                    </div>
                  </div>
                  <div data-ev-id="ev_8ea8229f0f" className="flex items-center gap-3">
                    <div data-ev-id="ev_02d44eebc0" className="w-4 h-4 rounded-full bg-success" />
                    <div data-ev-id="ev_21c577a191">
                      <p data-ev-id="ev_511f349b30" className="text-text font-medium">Android</p>
                      <p data-ev-id="ev_aaf1bba046" className="text-sm text-muted">{androidInstalls} installs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div data-ev-id="ev_dbee22285d" className="mt-8 bg-surface border border-border rounded-xl overflow-hidden">
          <div data-ev-id="ev_01305572de" className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 data-ev-id="ev_8a4751551b" className="text-lg font-semibold text-text">Recent Activity</h2>
          </div>
          {analytics.length === 0 ?
          <div data-ev-id="ev_c892ab6389" className="p-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 data-ev-id="ev_cd597e95ce" className="text-lg font-medium text-text mb-2">No analytics data yet</h3>
              <p data-ev-id="ev_2ea3fa6c57" className="text-muted">Analytics will appear here once users start visiting your app</p>
            </div> :

          <div data-ev-id="ev_d1604552d6" className="divide-y divide-border">
              {analytics.slice().reverse().slice(0, 7).map((data) =>
            <div data-ev-id="ev_a38ffd9961" key={data.id} className="px-6 py-4 flex items-center justify-between">
                  <div data-ev-id="ev_a24154d90e" className="flex items-center gap-4">
                    <div data-ev-id="ev_9855ae706b" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div data-ev-id="ev_b61e19621f">
                      <p data-ev-id="ev_55b9e0d6b3" className="font-medium text-text">
                        {new Date(data.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                      </p>
                    </div>
                  </div>
                  <div data-ev-id="ev_ff01ada094" className="flex items-center gap-8">
                    <div data-ev-id="ev_beef29a8fc" className="text-right">
                      <p data-ev-id="ev_5c0d829927" className="text-text font-medium">{data.visits ?? 0}</p>
                      <p data-ev-id="ev_4a24494d88" className="text-xs text-muted">Visits</p>
                    </div>
                    <div data-ev-id="ev_4762393bc4" className="text-right">
                      <p data-ev-id="ev_7246971665" className="text-text font-medium">{data.installs ?? 0}</p>
                      <p data-ev-id="ev_169faca3c7" className="text-xs text-muted">Installs</p>
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
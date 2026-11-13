import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAppAccess } from '@/hooks/useUserRole';
import { StatusPill } from '@/components/StatusPill';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Zap,
  Hammer,
  Bell,
  Users,
  Share2,
  Settings,
  Send,
  Clock,
  Check,
  X,
  ChevronDown,
  Smartphone,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Search,
  GripVertical,
  Globe,
  CloudSun,
  Layers,
  Facebook,
  User,
  Rss,
  Music,
  Image,
  MessageSquare,
  Gamepad2,
  Shield,
  FileText,
  Link as LinkIcon,
  Code,
  CheckCircle,
  AlertCircle,
  Upload,
  Building2,
  Calendar,
  MessageCircle,
  Video,
  Newspaper,
  Award,
  Grid3x3,
  Share2 as Share2Icon,
  Monitor } from
'lucide-react';
import { FEATURES, FEATURE_CATEGORIES, type Feature } from '@/data/features';
import { LAYOUT_TEMPLATES, FONTS, FONT_CATEGORIES } from '@/data/features';
import { FeatureSettingsModal } from '@/components/editor/feature-settings/FeatureSettingsModal';
import { DownloadTab } from '@/components/editor/DownloadTab';
import { TeamTab } from '@/components/editor/TeamTab';
import { useAppSettings } from '@/hooks/useAppSettings';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;
type PushNotification = Tables<'push_notifications'>;

const iconMap: Record<string, React.ComponentType<{className?: string;}>> = {
  Globe, CloudSun, Layers, Facebook, User, Rss, Music, Image, MessageSquare, Gamepad2, Shield, FileText, Link: LinkIcon, Code,
  Building2, Calendar, MessageCircle, Video, Newspaper, Award, Grid3x3, Share2: Share2Icon, Monitor, Users
};

// Feature descriptions map (fixing the duplicate issue)
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'websites': 'Embed external websites and web apps inside your PWA with an in-app browser.',
  'links': 'Create a collection of quick-access links for your users to tap.',
  'rss-feed': 'Display content from RSS feeds like blogs, news, or podcasts.',
  'audio': 'Host audio content like music, podcasts, or meditation tracks.',
  'wallpaper': 'Share downloadable wallpapers and images with your users.',
  'wordpress': 'Connect your WordPress site and display posts in-app.',
  'ai-chat': 'Add an AI-powered chatbot for user interactions.',
  'social-media': 'Link to your social media profiles and pages.',
  'games': 'Include a collection of HTML5 games playable offline.',
  'weather': 'Show weather forecasts based on user location.',
  'privacy-policy': 'Auto-generated privacy policy page required for app stores.',
  'custom-page': 'Create custom HTML pages for any content you need.',
  'website-to-app': 'Wrap any website as a full-screen app experience.',
  'source-code': 'Embed custom HTML, CSS, and JavaScript code.',
  'iframe': 'Embed external content like maps, calendars, or dashboards.',
  'my-account': 'User authentication with sign-in and profile management.'
};

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

    // Log the full response for debugging
    console.log('Edge Function response:', { data, error });

    // Handle Supabase client errors (network, CORS, etc.)
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

    // Handle application-level errors from the Edge Function
    if (!data) {
      throw new Error('No response from notification service');
    }

    if (!data.success) {
      // Surface the actual error from Gravitec or the Edge Function
      const errorMessage = data.error || data.message || 'Failed to send notification';
      console.error('Edge Function returned error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  } catch (err) {
    // Re-throw with better context
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('An unexpected error occurred while sending the notification');
  }
}

type TabId = 'build' | 'notify' | 'audience' | 'distribute' | 'settings';
type SettingsSubTab = 'general' | 'team' | 'subscription' | 'api' | 'emails' | 'support';
type AudienceSubTab = 'users' | 'analytics';

export default function AppEditor() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { user, role: userRole } = useAuth();
  const { canEdit, canManageTeam, loading: accessLoading } = useAppAccess(appId);
  const [app, setApp] = useState<App | null>(null);
  const [features, setFeatures] = useState<AppFeature[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine default tab based on app status
  const getDefaultTab = (appStatus: string | undefined): TabId => {
    return appStatus === 'active' ? 'notify' : 'build';
  };

  const [activeTab, setActiveTab] = useState<TabId>('build');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');
  const [audienceSubTab, setAudienceSubTab] = useState<AudienceSubTab>('users');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const fetchData = async () => {
    if (!supabase || !appId) return;

    const [appResult, featuresResult, notificationsResult] = await Promise.all([
    supabase.from('apps').select('*').eq('id', appId).single(),
    supabase.from('app_features').select('*').eq('app_id', appId).order('position'),
    supabase.from('push_notifications').select('*').eq('app_id', appId).order('created_at', { ascending: false })]
    );

    if (appResult.data) {
      setApp(appResult.data);
      setActiveTab(getDefaultTab(appResult.data.status));
    }
    setFeatures(featuresResult.data ?? []);
    setNotifications(notificationsResult.data ?? []);
    setLoading(false);
  };

  const updateApp = async (updates: Partial<App>) => {
    if (!supabase || !app) return;
    const { data } = await supabase.from('apps').update(updates).eq('id', app.id).select().single();
    if (data) setApp(data);
  };

  const addFeature = async (feature: Omit<AppFeature, 'id' | 'app_id' | 'created_at' | 'updated_at'>) => {
    if (!supabase || !app) return;
    const { data } = await supabase.from('app_features').insert({ app_id: app.id, ...feature, position: features.length }).select().single();
    if (data) setFeatures([...features, data]);
  };

  const removeFeature = async (featureId: string) => {
    if (!supabase) return;
    if (!confirm('Delete this feature? This cannot be undone.')) return;
    await supabase.from('app_features').delete().eq('id', featureId);
    setFeatures(features.filter((f) => f.id !== featureId));
  };

  const updateFeature = async (featureId: string, updates: Partial<AppFeature>) => {
    if (!supabase) return;
    const { data } = await supabase.from('app_features').update(updates).eq('id', featureId).select().single();
    if (data) setFeatures(features.map((f) => f.id === featureId ? data : f));
  };

  const handlePublish = async () => {
    if (!app) return;
    const newStatus = app.status === 'active' ? 'active' : 'active';
    await updateApp({ status: newStatus });
  };

  const previewUrl = app?.subdomain ?
  `https://${app.subdomain}.${window.location.hostname.split('.').slice(-2).join('.')}` :
  `/preview/${app?.slug}`;

  if (loading || accessLoading) {
    return (
      <div data-ev-id="ev_763b69de6c" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  if (!app) {
    return (
      <div data-ev-id="ev_a442e4849e" className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p data-ev-id="ev_e7879ad69b" className="text-text text-lg mb-4">App not found</p>
        <Link data-ev-id="ev_de1a839c67" to="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
      </div>);

  }

  const tabs: {id: TabId;label: string;icon: React.ComponentType<{className?: string;}>;}[] = [
  { id: 'build', label: 'Build', icon: Hammer },
  { id: 'notify', label: 'Notify', icon: Bell },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'distribute', label: 'Distribute', icon: Share2 },
  { id: 'settings', label: 'Settings', icon: Settings }];


  return (
    <div data-ev-id="ev_654d4bd6e6" className="min-h-screen bg-background flex flex-col">
      {/* Header Bar - 72px */}
      <header data-ev-id="ev_f1d34b05ad" className="h-[72px] bg-surface border-b border-border flex items-center px-6 shrink-0">
        {/* Left: Back + App Info */}
        <div data-ev-id="ev_4fb0ae4332" className="flex items-center gap-4">
          <Link data-ev-id="ev_a2009ed41d"
          to="/dashboard"
          className="p-2 -ml-2 text-text-secondary hover:text-text hover:bg-surface-elevated rounded-[10px] transition-colors">

            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div data-ev-id="ev_18094e7453" className="flex items-center gap-3">
            {app.icon_url ?
            <img data-ev-id="ev_a733c7c15c" src={app.icon_url} alt={app.name} className="w-10 h-10 rounded-[10px] object-cover" /> :

            <div data-ev-id="ev_864e3e41cd"
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg font-display font-bold"
            style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

                {app.name.charAt(0).toUpperCase()}
              </div>
            }
            <div data-ev-id="ev_fdc040e33a">
              <h1 data-ev-id="ev_2f0aecd243" className="font-display font-semibold text-text">{app.name}</h1>
              <StatusPill status={app.status === 'active' ? 'live' : 'draft'} className="mt-0.5" />
            </div>
          </div>
        </div>

        {/* Center: Tabs */}
        <div data-ev-id="ev_c7e113a44c" className="flex-1 flex justify-center">
          <div data-ev-id="ev_69ce461f18" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1">
            {tabs.map((tab) =>
            <button data-ev-id="ev_5254befd0a"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors min-h-[36px] ${
            activeTab === tab.id ?
            'bg-primary text-white' :
            'text-text-secondary hover:text-text'}`
            }>

                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            )}
          </div>
        </div>

        {/* Right: Preview + Publish */}
        <div data-ev-id="ev_efdce88d61" className="flex items-center gap-3">
          <a data-ev-id="ev_8e36d53a42"
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-raised hover:bg-border-strong text-text rounded-[10px] transition-colors text-sm font-medium min-h-[44px] border border-border">

            <ExternalLink className="w-4 h-4" />
            Preview
          </a>
          <button data-ev-id="ev_9077cb1751"
          onClick={handlePublish}
          className="flex items-center gap-2 px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-[10px] transition-colors text-sm font-medium min-h-[44px]">

            {app.status === 'active' ? 'Update' : 'Publish app'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div data-ev-id="ev_3ef833b3ad" className="flex-1 overflow-hidden">
        {activeTab === 'build' &&
        <BuildTab
          app={app}
          features={features}
          onUpdateApp={updateApp}
          onAddFeature={addFeature}
          onRemoveFeature={removeFeature}
          onUpdateFeature={updateFeature} />

        }
        {activeTab === 'notify' &&
        <NotifyTab
          app={app}
          notifications={notifications}
          setNotifications={setNotifications} />

        }
        {activeTab === 'audience' &&
        <AudienceTab
          app={app}
          subTab={audienceSubTab}
          setSubTab={setAudienceSubTab} />

        }
        {activeTab === 'distribute' &&
        <div data-ev-id="ev_94b26a9c55" className="p-8 max-w-4xl mx-auto">
            <DownloadTab app={app} onUpdate={updateApp} />
          </div>
        }
        {activeTab === 'settings' &&
        <SettingsTab
          app={app}
          subTab={settingsSubTab}
          setSubTab={setSettingsSubTab}
          canManageTeam={canManageTeam} />

        }
      </div>
    </div>);

}

// ============ BUILD TAB ============
function BuildTab({
  app,
  features,
  onUpdateApp,
  onAddFeature,
  onRemoveFeature,
  onUpdateFeature







}: {app: App;features: AppFeature[];onUpdateApp: (updates: Partial<App>) => Promise<void>;onAddFeature: (feature: Omit<AppFeature, 'id' | 'app_id' | 'created_at' | 'updated_at'>) => void;onRemoveFeature: (featureId: string) => void;onUpdateFeature: (featureId: string, updates: Partial<AppFeature>) => void;}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<AppFeature | null>(null);
  const [activeSection, setActiveSection] = useState<'design' | 'features'>('features');

  const enabledFeatures = features.filter((f) => f.is_enabled);

  return (
    <div data-ev-id="ev_a1fc3d1c4c" className="h-full flex">
      {/* Phone Preview - Left, aligned to top */}
      <div data-ev-id="ev_9276dc1696" className="w-[400px] bg-surface-elevated border-r border-border p-8 flex justify-center items-start pt-12">
        <PhonePreviewEnhanced app={app} features={features} />
      </div>

      {/* Content - Right */}
      <div data-ev-id="ev_adc5570fb4" className="flex-1 overflow-y-auto p-8">
        {/* Section Toggle */}
        <div data-ev-id="ev_66bfe97c9c" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1 mb-6 w-fit">
          <button data-ev-id="ev_a79322b1d3"
          onClick={() => setActiveSection('features')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
          activeSection === 'features' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
          }>

            Features
          </button>
          <button data-ev-id="ev_611ebd499c"
          onClick={() => setActiveSection('design')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
          activeSection === 'design' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
          }>

            Design & Customize
          </button>
        </div>

        {activeSection === 'features' ?
        <div data-ev-id="ev_4bc08fc2d6" className="max-w-3xl">
            <div data-ev-id="ev_e424b523b7" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_2ca3ec6573" className="flex items-center gap-2">
                <h2 data-ev-id="ev_b608b5a9e4" className="text-lg font-display font-semibold text-text">Features</h2>
                <span data-ev-id="ev_ea7757e456" className="bg-primary/20 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
                  {enabledFeatures.length}
                </span>
              </div>
              <button data-ev-id="ev_e568cf3608"
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary-hover text-white font-medium px-4 py-2 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">

                <Plus className="w-4 h-4" />
                Add Feature
              </button>
            </div>

            {features.length === 0 ?
          <div data-ev-id="ev_f8e4f28185" className="bg-card border border-border rounded-[16px] p-12 text-center">
                <Layers className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <h3 data-ev-id="ev_fdf6ae734c" className="text-lg font-medium text-text mb-2">No features yet</h3>
                <p data-ev-id="ev_dc72721e0e" className="text-text-secondary mb-4">Add features to build your app</p>
                <button data-ev-id="ev_26ccca104f"
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-[10px] inline-flex items-center gap-2 transition-colors">

                  <Plus className="w-4 h-4" />
                  Add Feature
                </button>
              </div> :

          <div data-ev-id="ev_43f4baa546" className="flex flex-col gap-3">
                {features.map((feature) => {
              const IconComponent = iconMap[feature.icon ?? 'Globe'] ?? Globe;
              const description = FEATURE_DESCRIPTIONS[feature.feature_type ?? ''] || 'Custom feature';

              return (
                <div data-ev-id="ev_bd3b3fb164"
                key={feature.id}
                className="bg-card border border-border rounded-[16px] p-4 flex items-center gap-4 hover:border-border-strong transition-colors">

                      <div data-ev-id="ev_9e7220e555"
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                  style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

                        <IconComponent className="w-6 h-6" style={{ color: app.theme_color ?? '#B8956B' }} />
                      </div>

                      <div data-ev-id="ev_4cf2d42475" className="flex-1 min-w-0">
                        <h3 data-ev-id="ev_34a7160779" className="font-medium text-text">{feature.name}</h3>
                        <p data-ev-id="ev_90990026c4" className="text-sm text-text-secondary truncate">{description}</p>
                      </div>

                      <div data-ev-id="ev_1e121093d6" className="flex items-center gap-3">
                        {/* Visibility Toggle */}
                        <button data-ev-id="ev_e7b767329d"
                    onClick={() => onUpdateFeature(feature.id, { is_enabled: !feature.is_enabled })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    feature.is_enabled ?
                    'bg-success/20 text-success' :
                    'bg-surface-raised text-text-tertiary'}`
                    }>

                          {feature.is_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          {feature.is_enabled ? 'Visible' : 'Hidden'}
                        </button>
                        <button data-ev-id="ev_bfc0dfa206"
                    onClick={() => setEditingFeature(feature)}
                    className="p-2 text-text-secondary hover:text-text hover:bg-surface-raised rounded-[8px] transition-colors"
                    title="Settings">

                          <Settings className="w-5 h-5" />
                        </button>
                        <button data-ev-id="ev_29b06a86e7"
                    onClick={() => onRemoveFeature(feature.id)}
                    className="p-2 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-[8px] transition-colors"
                    title="Delete">

                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>);

            })}
              </div>
          }
          </div> :

        <DesignCustomizeSection app={app} onUpdate={onUpdateApp} />
        }

        {/* Add Feature Modal */}
        {showAddModal &&
        <AddFeatureModal
          existingFeatures={features}
          onClose={() => setShowAddModal(false)}
          onAdd={(feature) => {
            onAddFeature({
              feature_type: feature.id,
              name: feature.name,
              icon: feature.icon,
              is_enabled: true,
              position: features.length,
              settings: {}
            });
          }} />

        }

        {/* Feature Settings Modal */}
        {editingFeature &&
        <FeatureSettingsModal
          app={app}
          feature={editingFeature}
          onClose={() => setEditingFeature(null)}
          onUpdate={(settings) => {
            onUpdateFeature(editingFeature.id, { settings: settings as AppFeature['settings'] });
            setEditingFeature(null);
          }} />

        }
      </div>
    </div>);

}

// ============ ENHANCED PHONE PREVIEW ============
function PhonePreviewEnhanced({ app, features }: {app: App;features: AppFeature[];}) {
  const enabledFeatures = features.filter((f) => f.is_enabled);

  // Use a lighter, more appealing default theme
  const bgColor = app.background_color ?? '#1a1d24';
  const themeColor = app.theme_color ?? '#B8956B';
  const textColor = app.text_color ?? '#ffffff';

  return (
    <div data-ev-id="ev_08db2d4cee" className="relative">
      {/* Phone Frame */}
      <div data-ev-id="ev_14a55cb181" className="w-[280px] h-[560px] bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden border-[6px] border-gray-800 relative">
        {/* Notch */}
        <div data-ev-id="ev_e630bb646f" className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-b-2xl z-10" />

        {/* Status Bar */}
        <div data-ev-id="ev_c4a9a000ce" className="h-10 bg-gray-900/50 flex items-center justify-between px-6 pt-1">
          <span data-ev-id="ev_a9e3604795" className="text-[10px] font-medium text-white">9:41</span>
          <div data-ev-id="ev_e442b295ab" className="flex items-center gap-1">
            <div data-ev-id="ev_9a7b0197eb" className="w-3 h-2 border border-white rounded-sm relative">
              <div data-ev-id="ev_a37ee78c21" className="absolute inset-0.5 bg-white rounded-sm" style={{ width: '70%' }} />
            </div>
          </div>
        </div>

        {/* App Content */}
        <div data-ev-id="ev_7367b52758" className="h-full flex flex-col" style={{ backgroundColor: bgColor }}>
          {/* App Logo/Image Area */}
          <div data-ev-id="ev_e3cd8f6a51" className="flex-1 flex flex-col items-center justify-center px-6">
            {app.homepage_image_url ?
            <img data-ev-id="ev_2d87b0f8d7" src={app.homepage_image_url} alt={app.name} className="w-24 h-24 object-contain rounded-2xl" /> :

            <div data-ev-id="ev_8563cde7dd"
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold"
            style={{ backgroundColor: themeColor + '40', color: themeColor }}>

                {app.name.charAt(0).toUpperCase()}
              </div>
            }
            <h2 data-ev-id="ev_8acf3393e6"
            className="text-lg font-bold mt-3 text-center"
            style={{ color: textColor }}>

              {app.name.toUpperCase()}
            </h2>
          </div>

          {/* Feature Icons Grid */}
          <div data-ev-id="ev_d6f660c0ca" className="p-5">
            <div data-ev-id="ev_16b075c224" className="grid grid-cols-3 gap-3">
              {enabledFeatures.slice(0, 6).map((feature) => {
                const IconComponent = iconMap[feature.icon ?? 'Globe'] ?? Globe;
                // Wrap to two lines instead of truncating
                const displayName = feature.name.length > 12 ?
                feature.name.slice(0, 12).trim() :
                feature.name;
                return (
                  <div data-ev-id="ev_fe16edd3dd" key={feature.id} className="flex flex-col items-center gap-1.5 p-2">
                    <div data-ev-id="ev_fd8655576c"
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: themeColor + '30' }}>

                      <IconComponent className="w-6 h-6" style={{ color: themeColor }} />
                    </div>
                    {app.icon_titles_visible !== false &&
                    <span data-ev-id="ev_34bfa520e0"
                    className="text-[10px] font-medium text-center leading-tight h-6 flex items-center"
                    style={{ color: textColor }}>

                        {displayName}
                      </span>
                    }
                  </div>);

              })}
            </div>
          </div>

          {/* Home Indicator */}
          <div data-ev-id="ev_6385c5cf74" className="pb-2 flex justify-center">
            <div data-ev-id="ev_5da30fe4bb" className="w-28 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>);

}

// ============ DESIGN & CUSTOMIZE SECTION ============
function DesignCustomizeSection({ app, onUpdate }: {app: App;onUpdate: (updates: Partial<App>) => void;}) {
  return (
    <div data-ev-id="ev_2e411a2bb1" className="max-w-3xl flex flex-col gap-8">
      {/* Colors */}
      <section data-ev-id="ev_8779a64149" className="bg-card border border-border rounded-[16px] p-6">
        <h3 data-ev-id="ev_7afcb18cab" className="text-[17px] font-display font-semibold text-text mb-4">Colors</h3>
        <div data-ev-id="ev_e3ac62b893" className="grid grid-cols-3 gap-4">
          <div data-ev-id="ev_fc65eaeeee">
            <label data-ev-id="ev_4a9fa9f7f0" className="block text-sm text-text-secondary mb-2">Theme Color</label>
            <div data-ev-id="ev_bca4334e85" className="flex items-center gap-2">
              <input data-ev-id="ev_4740bc2971"
              type="color"
              value={app.theme_color ?? '#B8956B'}
              onChange={(e) => onUpdate({ theme_color: e.target.value })}
              className="w-10 h-10 rounded-[8px] border border-border cursor-pointer" />

              <input data-ev-id="ev_77b695affc"
              type="text"
              value={app.theme_color ?? '#B8956B'}
              onChange={(e) => onUpdate({ theme_color: e.target.value })}
              className="flex-1 bg-input border border-border rounded-[10px] px-3 py-2 text-text text-sm" />

            </div>
          </div>
          <div data-ev-id="ev_d7dc07fefe">
            <label data-ev-id="ev_8427b077da" className="block text-sm text-text-secondary mb-2">Background</label>
            <div data-ev-id="ev_a0b1885122" className="flex items-center gap-2">
              <input data-ev-id="ev_a47489bca1"
              type="color"
              value={app.background_color ?? '#1a1d24'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              className="w-10 h-10 rounded-[8px] border border-border cursor-pointer" />

              <input data-ev-id="ev_e3f2d73b6e"
              type="text"
              value={app.background_color ?? '#1a1d24'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              className="flex-1 bg-input border border-border rounded-[10px] px-3 py-2 text-text text-sm" />

            </div>
          </div>
          <div data-ev-id="ev_df82b08a70">
            <label data-ev-id="ev_bdd044421f" className="block text-sm text-text-secondary mb-2">Text Color</label>
            <div data-ev-id="ev_7bc7898471" className="flex items-center gap-2">
              <input data-ev-id="ev_aef5707ac9"
              type="color"
              value={app.text_color ?? '#ffffff'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="w-10 h-10 rounded-[8px] border border-border cursor-pointer" />

              <input data-ev-id="ev_de5a6cbfb9"
              type="text"
              value={app.text_color ?? '#ffffff'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="flex-1 bg-input border border-border rounded-[10px] px-3 py-2 text-text text-sm" />

            </div>
          </div>
        </div>
      </section>

      {/* App Icon */}
      <section data-ev-id="ev_89aeb93a50" className="bg-card border border-border rounded-[16px] p-6">
        <h3 data-ev-id="ev_975e5a843f" className="text-[17px] font-display font-semibold text-text mb-4">App Icon</h3>
        <div data-ev-id="ev_58af3f8527" className="flex items-center gap-4">
          {app.icon_url ?
          <img data-ev-id="ev_29c15db6a6" src={app.icon_url} alt="App icon" className="w-20 h-20 rounded-2xl object-cover" /> :

          <div data-ev-id="ev_b478a80b0d"
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30', color: app.theme_color ?? '#B8956B' }}>

              {app.name.charAt(0).toUpperCase()}
            </div>
          }
          <div data-ev-id="ev_c2d487b4cf">
            <input data-ev-id="ev_3d27a8026a"
            type="text"
            value={app.icon_url ?? ''}
            onChange={(e) => onUpdate({ icon_url: e.target.value })}
            placeholder="Paste image URL or upload"
            className="w-80 bg-input border border-border rounded-[10px] px-4 py-2.5 text-text text-sm placeholder:text-text-tertiary" />

            <p data-ev-id="ev_2fe37444cc" className="text-xs text-text-tertiary mt-1">512×512px recommended</p>
          </div>
        </div>
      </section>

      {/* Display Options */}
      <section data-ev-id="ev_39dc619b35" className="bg-card border border-border rounded-[16px] p-6">
        <h3 data-ev-id="ev_cf343fc75f" className="text-[17px] font-display font-semibold text-text mb-4">Display Options</h3>
        <label data-ev-id="ev_17aad2bab1" className="flex items-center gap-3 cursor-pointer">
          <div data-ev-id="ev_9c35a5ed6a"
          className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
          app.icon_titles_visible !== false ? 'bg-success' : 'bg-surface-raised'}`
          }
          onClick={() => onUpdate({ icon_titles_visible: app.icon_titles_visible === false })}>

            <div data-ev-id="ev_ee795043d7"
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
            app.icon_titles_visible !== false ? 'translate-x-6' : 'translate-x-0'}`
            } />

          </div>
          <span data-ev-id="ev_426794a23d" className="text-text">Show feature titles on home screen</span>
        </label>
      </section>
    </div>);

}

// ============ NOTIFY TAB ============
function NotifyTab({
  app,
  notifications,
  setNotifications




}: {app: App;notifications: PushNotification[];setNotifications: React.Dispatch<React.SetStateAction<PushNotification[]>>;}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [openUrl, setOpenUrl] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [previewMode, setPreviewMode] = useState<'lock' | 'home'>('lock');
  const [toast, setToast] = useState<{type: 'success' | 'error';message: string;} | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  // Check if browser supports notifications and permission status
  const notificationPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  const subscriberCount = app.total_installs ?? 0;
  const sentNotifications = notifications.filter((n) => n.status === 'sent');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSend = async (confirmed: boolean = false) => {
    if (!supabase || !title.trim() || !body.trim()) return;

    if (!confirmed && subscriberCount > 0) {
      setShowSendConfirm(true);
      return;
    }

    setSending(true);
    setShowSendConfirm(false);

    try {
      // Create notification record
      const { data, error } = await supabase.
      from('push_notifications').
      insert({
        app_id: app.id,
        title: title.trim(),
        body: body.trim(),
        url: openUrl.trim() || null,
        status: 'sent'
      }).
      select().
      single();

      if (error) throw error;

      // Send the notification
      const result = await sendPushNotification(data.id, title.trim(), body.trim(), openUrl.trim() || undefined);

      const updatedNotification = {
        ...data,
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        gravitec_push_id: (result.gravitecResponse?.taskId as string) || null
      };

      setNotifications([updatedNotification, ...notifications]);
      setTitle('');
      setBody('');
      setOpenUrl('');
      showToast('success', 'Notification sent!');
    } catch (err) {
      console.error('Send notification error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      showToast('error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Handle test send - sends to all subscribers but marks as test
  const handleTestSend = async () => {
    if (!supabase || !title.trim() || !body.trim()) {
      showToast('error', 'Please enter a title and message first');
      return;
    }

    // Check if notifications are supported
    if (typeof Notification === 'undefined') {
      showToast('error', 'Your browser does not support notifications');
      return;
    }

    // Check notification permission
    if (notificationPermission === 'denied') {
      showToast('error', 'Notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    if (notificationPermission === 'default') {
      showToast('error', 'Allow notifications for this app in your browser first, then try the test again.');
      return;
    }

    // Check if there are any subscribers
    if (subscriberCount === 0) {
      showToast('error', 'No subscribers yet. Install the app on a device and allow notifications first.');
      return;
    }

    setSendingTest(true);

    try {
      // Create a test notification record
      const { data, error } = await supabase.
      from('push_notifications').
      insert({
        app_id: app.id,
        title: `[TEST] ${title.trim()}`,
        body: body.trim(),
        url: openUrl.trim() || null,
        status: 'sent'
      }).
      select().
      single();

      if (error) {
        console.error('Failed to create test notification record:', error);
        throw new Error(error.message);
      }

      // Send the test notification
      const result = await sendPushNotification(
        data.id,
        `[TEST] ${title.trim()}`,
        body.trim(),
        openUrl.trim() || undefined,
        true // testMode flag
      );

      // Update the notification record
      const updatedNotification = {
        ...data,
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        recipients_count: result.recipients || 0
      };

      setNotifications([updatedNotification, ...notifications]);
      showToast('success', `Test notification sent to ${result.recipients || 0} subscriber(s)!`);
    } catch (err) {
      console.error('Test send error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      showToast('error', errorMessage);
    } finally {
      setSendingTest(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div data-ev-id="ev_bb79428aab" className="h-full flex">
      {/* Left: Composer + Sent List */}
      <div data-ev-id="ev_d3e88cd8e3" className="flex-1 overflow-y-auto p-8">
        {/* Toast */}
        {toast &&
        <div data-ev-id="ev_3d3a1bcecb" className={`fixed top-20 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-[10px] shadow-lg ${
        toast.type === 'success' ? 'bg-success text-white' : 'bg-destructive text-white'}`
        }>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span data-ev-id="ev_469a3c4c73" className="font-medium">{toast.message}</span>
            <button data-ev-id="ev_83e11956d9" onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        }

        <div data-ev-id="ev_a800a0d51e" className="max-w-2xl">
          {/* Header */}
          <div data-ev-id="ev_b9c9f35c4f" className="mb-6">
            <h2 data-ev-id="ev_d129be665b" className="text-[22px] font-display font-bold text-text tracking-tight">New notification</h2>
            <p data-ev-id="ev_26a105b96a" className="text-text-secondary mt-1">
              Reaches everyone who installed {app.name} and allowed notifications.
            </p>
          </div>

          {/* Composer Card */}
          <div data-ev-id="ev_ea6bd2937a" className="bg-card border border-border rounded-[16px] p-6 mb-8">
            {/* Title */}
            <div data-ev-id="ev_17b877d497" className="mb-4">
              <div data-ev-id="ev_e3ba92b542" className="flex items-center justify-between mb-1.5">
                <label data-ev-id="ev_c3c2f7596d" className="text-sm font-medium text-text">Title</label>
                <span data-ev-id="ev_2f9af52505" className="text-xs text-text-tertiary">{title.length}/50</span>
              </div>
              <input data-ev-id="ev_163943c9e3"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="Notification title"
              maxLength={50}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]" />

            </div>

            {/* Message */}
            <div data-ev-id="ev_6e952c6c60" className="mb-4">
              <div data-ev-id="ev_04b36da4d6" className="flex items-center justify-between mb-1.5">
                <label data-ev-id="ev_a21b6349a5" className="text-sm font-medium text-text">Message</label>
                <span data-ev-id="ev_96ebb93d7e" className="text-xs text-text-tertiary">{body.length}/150</span>
              </div>
              <textarea data-ev-id="ev_16d357e7d7"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 150))}
              placeholder="Write your message..."
              maxLength={150}
              rows={3}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none" />

            </div>

            {/* Open URL */}
            <div data-ev-id="ev_58a8ddd480" className="mb-4">
              <label data-ev-id="ev_f55e602d40" className="block text-sm font-medium text-text mb-1.5">When tapped, open</label>
              <select data-ev-id="ev_ed7073daaf"
              value={openUrl}
              onChange={(e) => setOpenUrl(e.target.value)}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] appearance-none cursor-pointer">

                <option data-ev-id="ev_73869e5eb2" value="">App home (default)</option>
                <option data-ev-id="ev_51d8c50e0c" value={`/preview/${app.slug}`}>App preview link</option>
              </select>
            </div>

            {/* Schedule Toggle */}
            <div data-ev-id="ev_fd1639a71e" className="mb-6">
              <label data-ev-id="ev_43f4746ef5" className="block text-sm font-medium text-text mb-2">When to send</label>
              <div data-ev-id="ev_fbd4c6ff60" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1 w-fit">
                <button data-ev-id="ev_dfeb66cf49"
                onClick={() => setScheduleType('now')}
                className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                scheduleType === 'now' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
                }>

                  Now
                </button>
                <button data-ev-id="ev_b6411ae3b6"
                onClick={() => setScheduleType('schedule')}
                className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                scheduleType === 'schedule' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
                }>

                  Schedule
                </button>
              </div>
              {scheduleType === 'schedule' &&
              <div data-ev-id="ev_889a0b6ae8" className="flex gap-3 mt-3">
                  <input data-ev-id="ev_98c8f7d90e"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-input border border-border rounded-[10px] px-4 py-2 text-text" />

                  <input data-ev-id="ev_d5d4646707"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-input border border-border rounded-[10px] px-4 py-2 text-text" />

                </div>
              }
            </div>

            {/* Footer */}
            <div data-ev-id="ev_499a2eb6c5" className="flex items-center justify-between pt-4 border-t border-border">
              <span data-ev-id="ev_4122f4e4f4" className="text-sm text-text-secondary">
                Audience: All subscribers ({subscriberCount})
              </span>
              <div data-ev-id="ev_2e5319fce4" className="flex items-center gap-3">
                <button data-ev-id="ev_c8990cec83"
                onClick={handleTestSend}
                disabled={sendingTest || !title.trim() || !body.trim()}
                className="px-4 py-2.5 bg-surface-raised hover:bg-border-strong text-text rounded-[10px] transition-colors text-sm font-medium border border-border min-h-[44px] disabled:opacity-50 flex items-center gap-2">

                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send test to me
                </button>
                <button data-ev-id="ev_0d109c3116"
                onClick={() => handleSend(false)}
                disabled={sending || !title.trim() || !body.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-[10px] transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50">

                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send notification
                </button>
              </div>
            </div>
          </div>

          {/* Sent & Scheduled */}
          <div data-ev-id="ev_83e7ea95fc">
            <h3 data-ev-id="ev_afef206620" className="text-[17px] font-display font-semibold text-text mb-4">Sent and scheduled</h3>
            {sentNotifications.length === 0 ?
            <div data-ev-id="ev_ea54a47dc7" className="bg-card border border-border rounded-[16px] p-8 text-center">
                <Bell className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                <p data-ev-id="ev_7ad7baebdf" className="text-text-secondary">
                  Nothing sent yet. Your notifications and their open rates will be listed here.
                </p>
              </div> :

            <div data-ev-id="ev_b2a2c46006" className="flex flex-col gap-3">
                {sentNotifications.map((n) =>
              <div data-ev-id="ev_1201916e47" key={n.id} className="bg-card border border-border rounded-[16px] p-4 flex items-center gap-4">
                    <div data-ev-id="ev_ebd426af01" className="w-10 h-10 bg-success/20 rounded-[10px] flex items-center justify-center">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                    <div data-ev-id="ev_d2db55b14b" className="flex-1">
                      <p data-ev-id="ev_11b3dc4d5b" className="font-medium text-text">{n.title}</p>
                      <p data-ev-id="ev_1502dc759d" className="text-sm text-text-secondary">
                        {n.sent_at ? new Date(n.sent_at).toLocaleDateString() : 'Draft'} · <a data-ev-id="ev_fad3d5f31f" href="https://push.gravitec.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stats in Gravitec</a>
                      </p>
                    </div>
                  </div>
              )}
              </div>
            }
          </div>
        </div>
      </div>

      {/* Right: Phone Preview */}
      <div data-ev-id="ev_a9b9a9e9a1" className="w-[460px] bg-surface-elevated border-l border-border p-8">
        <div data-ev-id="ev_919607200e" className="flex items-center justify-between mb-4">
          <div data-ev-id="ev_85b4c46298" className="flex items-center gap-1 bg-surface rounded-[10px] p-1">
            <button data-ev-id="ev_863809d225"
            onClick={() => setPreviewMode('lock')}
            className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
            previewMode === 'lock' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
            }>

              Lock screen
            </button>
            <button data-ev-id="ev_5f0477cbf8"
            onClick={() => setPreviewMode('home')}
            className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
            previewMode === 'home' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
            }>

              App home
            </button>
          </div>
        </div>

        {/* Phone Frame */}
        <div data-ev-id="ev_927bf4603e" className="flex justify-center">
          <div data-ev-id="ev_46e3a46cba" className="w-[280px] h-[560px] bg-gradient-to-b from-neutral-900 to-neutral-800 rounded-[3rem] shadow-2xl overflow-hidden border-[6px] border-gray-800 relative">
            {/* Notch */}
            <div data-ev-id="ev_703408314e" className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-b-2xl z-10" />

            {previewMode === 'lock' ? (
            /* Lock Screen */
            <div data-ev-id="ev_009602022b" className="h-full flex flex-col pt-12 px-6">
                <div data-ev-id="ev_51292d96c7" className="text-center mb-8">
                  <p data-ev-id="ev_1c04c84177" className="text-white/60 text-sm">{currentDate}</p>
                  <p data-ev-id="ev_fd6e66f1ee" className="text-white text-5xl font-light mt-1">{currentTime}</p>
                </div>

                {/* Notification Banner */}
                {(title || body) &&
              <div data-ev-id="ev_fb97147970" className="bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg">
                    <div data-ev-id="ev_85f452d31a" className="flex items-start gap-3">
                      <div data-ev-id="ev_bd0d3bd58b"
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ backgroundColor: app.theme_color ?? '#B8956B', color: '#fff' }}>

                        {app.name.charAt(0)}
                      </div>
                      <div data-ev-id="ev_9c7b4493ac" className="flex-1 min-w-0">
                        <div data-ev-id="ev_40122cbe41" className="flex items-center gap-2 mb-0.5">
                          <span data-ev-id="ev_a3b8de676d" className="text-[10px] font-semibold text-gray-900 uppercase">{app.name}</span>
                          <span data-ev-id="ev_8003182aa7" className="text-[10px] text-gray-500">now</span>
                        </div>
                        <p data-ev-id="ev_f43b87ca1c" className="text-sm font-semibold text-gray-900 leading-tight">
                          {title || 'Notification Title'}
                        </p>
                        <p data-ev-id="ev_66aa7b9a5e" className="text-sm text-gray-600 leading-tight line-clamp-2">
                          {body || 'Your message will appear here...'}
                        </p>
                      </div>
                    </div>
                  </div>
              }
              </div>) : (

            /* App Home */
            <PhonePreviewEnhanced app={app} features={[]} />)
            }
          </div>
        </div>

        <p data-ev-id="ev_669ef9ecb0" className="text-xs text-text-tertiary text-center mt-4">
          Preview updates as you type. Appearance varies by device.
        </p>
      </div>

      {/* Send Confirmation Modal */}
      {showSendConfirm &&
      <div data-ev-id="ev_f4211dcfc3" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div data-ev-id="ev_9247cfeb1a" className="bg-card border border-border rounded-[16px] w-full max-w-sm p-7">
            <h2 data-ev-id="ev_ba91aa511c" className="text-[22px] font-display font-bold text-text mb-3 tracking-tight">Send to all subscribers?</h2>
            <p data-ev-id="ev_ee63119648" className="text-text-secondary mb-6">
              This notification will be sent to <strong data-ev-id="ev_05bb44cf2e" className="text-text">{subscriberCount} subscribers</strong> immediately.
            </p>
            <div data-ev-id="ev_09be174c50" className="flex gap-3">
              <button data-ev-id="ev_b766916261"
            onClick={() => setShowSendConfirm(false)}
            className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">

                Cancel
              </button>
              <button data-ev-id="ev_28cb78fd14"
            onClick={() => handleSend(true)}
            className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px]">

                Send now
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}

// ============ AUDIENCE TAB ============
function AudienceTab({
  app,
  subTab,
  setSubTab




}: {app: App;subTab: 'users' | 'analytics';setSubTab: (tab: 'users' | 'analytics') => void;}) {
  return (
    <div data-ev-id="ev_0517240bc5" className="p-8">
      <div data-ev-id="ev_f394d8474c" className="max-w-4xl mx-auto">
        {/* Sub-tabs */}
        <div data-ev-id="ev_4ae327c2b2" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1 mb-6 w-fit">
          <button data-ev-id="ev_7a5f50bfec"
          onClick={() => setSubTab('users')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
          subTab === 'users' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
          }>

            App Users
          </button>
          <button data-ev-id="ev_c3749ebd31"
          onClick={() => setSubTab('analytics')}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
          subTab === 'analytics' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
          }>

            Analytics
          </button>
        </div>

        {subTab === 'users' ?
        <AudienceUsersSection appId={app.id} /> :

        <AudienceAnalyticsSection app={app} />
        }
      </div>
    </div>);

}

function AudienceUsersSection({ appId }: {appId: string;}) {
  const [users, setUsers] = useState<Tables<'app_users'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('app_users').select('*').eq('app_id', appId).order('created_at', { ascending: false });
      setUsers(data ?? []);
      setLoading(false);
    };
    fetchUsers();
  }, [appId]);

  if (loading) {
    return <div data-ev-id="ev_17279c64f2" className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (users.length === 0) {
    return (
      <div data-ev-id="ev_99750cadf3" className="bg-card border border-border rounded-[16px] p-12 text-center">
        <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 data-ev-id="ev_6fe1670ebe" className="text-lg font-medium text-text mb-2">No users yet</h3>
        <p data-ev-id="ev_02f31ff10d" className="text-text-secondary">Users will appear here after they install your app.</p>
      </div>);

  }

  return (
    <div data-ev-id="ev_8cba1930f9" className="bg-card border border-border rounded-[16px] overflow-hidden">
      <div data-ev-id="ev_f0cfe7edb1" className="px-6 py-4 border-b border-border">
        <h3 data-ev-id="ev_f3844598f4" className="font-semibold text-text">{users.length} users</h3>
      </div>
      <div data-ev-id="ev_1b2b3e976c" className="divide-y divide-border">
        {users.slice(0, 20).map((u) =>
        <div data-ev-id="ev_2987ec9625" key={u.id} className="px-6 py-4 flex items-center gap-4">
            <div data-ev-id="ev_799ee01b5c" className="w-10 h-10 rounded-[10px] bg-surface-raised flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-text-secondary" />
            </div>
            <div data-ev-id="ev_6de5d10087" className="flex-1">
              <p data-ev-id="ev_78b54d90f3" className="text-text font-medium">{u.device_id?.slice(0, 20)}...</p>
              <p data-ev-id="ev_ecaeb0576d" className="text-sm text-text-secondary">{u.platform} · {new Date(u.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>);

}

function AudienceAnalyticsSection({ app }: {app: App;}) {
  return (
    <div data-ev-id="ev_21d0e2d7c3" className="grid grid-cols-3 gap-6">
      <div data-ev-id="ev_51ea88adf7" className="bg-card border border-border rounded-[16px] p-6">
        <p data-ev-id="ev_28ba9c1305" className="text-text-secondary text-sm mb-1">Total Visits</p>
        <p data-ev-id="ev_f2b0d46be3" className="text-3xl font-display font-bold text-text">{app.total_visits ?? 0}</p>
      </div>
      <div data-ev-id="ev_46f3fd4bb3" className="bg-card border border-border rounded-[16px] p-6">
        <p data-ev-id="ev_b167c48c72" className="text-text-secondary text-sm mb-1">Total Installs</p>
        <p data-ev-id="ev_48cbfa9326" className="text-3xl font-display font-bold text-text">{app.total_installs ?? 0}</p>
      </div>
      <div data-ev-id="ev_f77a2ef263" className="bg-card border border-border rounded-[16px] p-6">
        <p data-ev-id="ev_7399718a2c" className="text-text-secondary text-sm mb-1">Conversion Rate</p>
        <p data-ev-id="ev_21dfc991d4" className="text-3xl font-display font-bold text-success">
          {(app.total_visits ?? 0) > 0 ?
          ((app.total_installs ?? 0) / (app.total_visits ?? 1) * 100).toFixed(1) :
          0}%
        </p>
      </div>
    </div>);

}

// ============ GENERAL SETTINGS SECTION ============
function GeneralSettingsSection() {
  const { settings, updateSettings, loading } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    base_portal_url: '',
    theme_mode: 'dark' as 'dark' | 'light',
    secondary_color: '#8B7355'
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        base_portal_url: settings.base_portal_url ?? 'https://muleshoetxchamber.com',
        theme_mode: settings.theme_mode as 'dark' | 'light' ?? 'dark',
        secondary_color: settings.secondary_color ?? '#8B7355'
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(localSettings);
    setSaving(false);
  };

  if (loading) {
    return (
      <div data-ev-id="ev_ef4e7d3dbc" className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>);

  }

  return (
    <div data-ev-id="ev_f7ce409d45" className="flex flex-col gap-6">
      {/* Base Portal URL */}
      <section data-ev-id="ev_f5fa043e76" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_baf9087e3e" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h3 data-ev-id="ev_5af9f09d3f" className="text-lg font-semibold text-text">Chamber Portal URL</h3>
        </div>
        <div data-ev-id="ev_2a2585706a" className="p-6">
          <p data-ev-id="ev_dd7b01cf2b" className="text-muted mb-4">
            Base URL for your Chamber Portal. All connector modules will use this as their root URL.
          </p>
          <input data-ev-id="ev_169d1d5616"
          type="url"
          value={localSettings.base_portal_url}
          onChange={(e) => setLocalSettings({ ...localSettings, base_portal_url: e.target.value })}
          placeholder="https://muleshoetxchamber.com"
          className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

        </div>
      </section>

      {/* Theme Mode */}
      <section data-ev-id="ev_c91876e8fc" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_5fd7a3684f" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h3 data-ev-id="ev_7b58950b27" className="text-lg font-semibold text-text">Theme Mode</h3>
        </div>
        <div data-ev-id="ev_70ad6e8a35" className="p-6">
          <p data-ev-id="ev_b1d5aeefb8" className="text-muted mb-4">
            Choose the overall appearance of the PWA for end users.
          </p>
          <div data-ev-id="ev_0ffdc3fc11" className="flex gap-4">
            <button data-ev-id="ev_dcaa069608"
            onClick={() => setLocalSettings({ ...localSettings, theme_mode: 'dark' })}
            className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
            localSettings.theme_mode === 'dark' ?
            'border-primary bg-primary/10' :
            'border-border hover:border-primary/50'}`
            }>

              <div data-ev-id="ev_4fd22c7fdc" className="w-full h-20 bg-neutral-900 rounded-lg mb-3 flex items-center justify-center">
                <span data-ev-id="ev_c7c06d3e85" className="text-white text-sm">Dark Theme</span>
              </div>
              <p data-ev-id="ev_cd18ddcbc2" className="text-text font-medium">Dark Mode</p>
              <p data-ev-id="ev_2ad8827cf1" className="text-muted text-sm">Dark background with light text</p>
            </button>
            <button data-ev-id="ev_7c628eb17e"
            onClick={() => setLocalSettings({ ...localSettings, theme_mode: 'light' })}
            className={`flex-1 p-4 rounded-xl border-2 transition-colors ${
            localSettings.theme_mode === 'light' ?
            'border-primary bg-primary/10' :
            'border-border hover:border-primary/50'}`
            }>

              <div data-ev-id="ev_622de26053" className="w-full h-20 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <span data-ev-id="ev_8bd2eaffcb" className="text-gray-800 text-sm">Light Theme</span>
              </div>
              <p data-ev-id="ev_078b74ee06" className="text-text font-medium">Light Mode</p>
              <p data-ev-id="ev_a04846e176" className="text-muted text-sm">Light background with dark text</p>
            </button>
          </div>
        </div>
      </section>

      {/* Secondary Color */}
      <section data-ev-id="ev_e8dd4b8f2f" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_02a143d18e" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h3 data-ev-id="ev_db3c2ceb89" className="text-lg font-semibold text-text">Secondary Color</h3>
        </div>
        <div data-ev-id="ev_fa41cac0c6" className="p-6">
          <p data-ev-id="ev_cacdb74868" className="text-muted mb-4">
            Accent color used for secondary elements and highlights.
          </p>
          <div data-ev-id="ev_4eb127a77d" className="flex items-center gap-4">
            <input data-ev-id="ev_e25de1b79d"
            type="color"
            value={localSettings.secondary_color}
            onChange={(e) => setLocalSettings({ ...localSettings, secondary_color: e.target.value })}
            className="w-12 h-10 rounded-lg border border-border cursor-pointer" />

            <span data-ev-id="ev_3a340da574" className="text-muted">{localSettings.secondary_color}</span>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <button data-ev-id="ev_fdd1d69f49"
      onClick={handleSave}
      disabled={saving}
      className="self-start bg-primary hover:bg-primary-hover text-white font-medium px-8 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">

        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save Settings
      </button>
    </div>);

}

// ============ SETTINGS TAB ============
function SettingsTab({
  app,
  subTab,
  setSubTab,
  canManageTeam





}: {app: App;subTab: SettingsSubTab;setSubTab: (tab: SettingsSubTab) => void;canManageTeam: boolean;}) {
  const navigate = useNavigate();

  const settingsTabs: {id: SettingsSubTab;label: string;}[] = [
  { id: 'general', label: 'General' },
  { id: 'team', label: 'Team' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'api', label: 'API' },
  { id: 'emails', label: 'Emails' },
  { id: 'support', label: 'Support' }];


  return (
    <div data-ev-id="ev_d771a46bd5" className="p-8">
      <div data-ev-id="ev_100acb6cbe" className="max-w-4xl mx-auto">
        {/* Sub-tabs */}
        <div data-ev-id="ev_a03f93a96b" className="flex items-center gap-1 bg-surface-raised rounded-[10px] p-1 mb-6 w-fit">
          {settingsTabs.map((tab) =>
          <button data-ev-id="ev_15a437ca7a"
          key={tab.id}
          onClick={() => {
            if (tab.id === 'emails') {
              navigate(`/app/${app.id}/emails`);
            } else {
              setSubTab(tab.id);
            }
          }}
          className={`px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
          subTab === tab.id ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'}`
          }>

              {tab.label}
            </button>
          )}
        </div>

        {subTab === 'general' && <GeneralSettingsSection />}
        {subTab === 'team' && canManageTeam && <TeamTab app={app} />}
        {subTab === 'subscription' &&
        <div data-ev-id="ev_ccb63bfedc" className="bg-card border border-border rounded-[16px] p-8 text-center">
            <p data-ev-id="ev_fc3babdba7" className="text-text-secondary">Subscription management coming soon.</p>
          </div>
        }
        {subTab === 'api' &&
        <div data-ev-id="ev_be4df85195" className="bg-card border border-border rounded-[16px] p-8 text-center">
            <p data-ev-id="ev_27177183c7" className="text-text-secondary">API settings coming soon.</p>
          </div>
        }
        {subTab === 'support' &&
        <div data-ev-id="ev_ca5129a720" className="bg-card border border-border rounded-[16px] p-8 text-center">
            <p data-ev-id="ev_32d4c221ec" className="text-text-secondary">Support settings coming soon.</p>
          </div>
        }
      </div>
    </div>);

}

// ============ ADD FEATURE MODAL ============
function AddFeatureModal({
  existingFeatures,
  onClose,
  onAdd




}: {existingFeatures: AppFeature[];onClose: () => void;onAdd: (feature: Feature) => void;}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const existingIds = new Set(existingFeatures.map((f) => f.feature_type));

  const filteredFeatures = FEATURES.filter((feature) => {
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || feature.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div data-ev-id="ev_7c4b0a4bad" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_217bda4119" className="bg-card border border-border rounded-[16px] w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_2d7a970b3d" className="flex items-center justify-between p-6 border-b border-border">
          <h2 data-ev-id="ev_03ecca2f92" className="text-[22px] font-display font-bold text-text tracking-tight">Add Features</h2>
          <button data-ev-id="ev_ce1229ec00" onClick={onClose} className="p-2 text-text-tertiary hover:text-text rounded-[8px]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div data-ev-id="ev_86f401802d" className="p-4 border-b border-border">
          <div data-ev-id="ev_0a17498a72" className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input data-ev-id="ev_002a42ff15"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features..."
            className="w-full bg-input border border-border rounded-[10px] pl-10 pr-4 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />

          </div>
          <div data-ev-id="ev_37c66f26ae" className="flex flex-wrap gap-2">
            {FEATURE_CATEGORIES.map((cat) =>
            <button data-ev-id="ev_b0bde5a372"
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
            selectedCategory === cat.id ?
            'bg-primary text-white' :
            'bg-surface-raised text-text-secondary hover:text-text'}`
            }>

                {cat.label}
              </button>
            )}
          </div>
        </div>

        {/* Features List */}
        <div data-ev-id="ev_716393581c" className="flex-1 overflow-y-auto p-4">
          <div data-ev-id="ev_35590c13ff" className="flex flex-col gap-3">
            {filteredFeatures.map((feature) => {
              const IconComponent = iconMap[feature.icon] ?? Globe;
              const isAdded = existingIds.has(feature.id);

              return (
                <div data-ev-id="ev_ada4ef16dc"
                key={feature.id}
                className="bg-surface-raised border border-border rounded-[12px] p-4 flex items-center gap-4">

                  <div data-ev-id="ev_712bffafb2" className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div data-ev-id="ev_949d825936" className="flex-1">
                    <h3 data-ev-id="ev_080eb47255" className="font-medium text-text">{feature.name}</h3>
                    <p data-ev-id="ev_cee7c5e39c" className="text-sm text-text-secondary line-clamp-1">{feature.description}</p>
                  </div>
                  <button data-ev-id="ev_e5c3471d28"
                  onClick={() => {if (!isAdded) onAdd(feature);}}
                  disabled={isAdded}
                  className={`p-2 rounded-[8px] transition-colors ${
                  isAdded ?
                  'bg-success/20 text-success cursor-not-allowed' :
                  'bg-primary hover:bg-primary-hover text-white'}`
                  }>

                    {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>);

            })}
          </div>
        </div>
      </div>
    </div>);

}
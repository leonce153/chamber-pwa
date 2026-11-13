import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp, useAppFeatures } from '@/hooks/useApp';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import { PhonePreview } from '@/components/editor/PhonePreview';
import { FeatureSettingsModal } from '@/components/editor/feature-settings/FeatureSettingsModal';
import { FEATURES, FEATURE_CATEGORIES, type Feature } from '@/data/features';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  X,
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
  Upload,
  Palette } from
'lucide-react';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

const iconMap: Record<string, React.ComponentType<{className?: string;}>> = {
  Globe, CloudSun, Layers, Facebook, User, Rss, Music, Image, MessageSquare, Gamepad2, Shield, FileText, Link: LinkIcon, Code
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'websites': 'Embed external websites and web apps inside your PWA.',
  'links': 'Create a collection of quick-access links for your users.',
  'rss-feed': 'Display content from RSS feeds like blogs, news, or podcasts.',
  'audio': 'Host audio content like music, podcasts, or meditation tracks.',
  'wallpaper': 'Share downloadable wallpapers and images with your users.',
  'wordpress': 'Connect your WordPress site and display posts in-app.',
  'ai-chat': 'Add an AI-powered chatbot for user interactions.',
  'social-media': 'Link to your social media profiles and pages.',
  'games': 'Include a collection of HTML5 games playable offline.',
  'weather': 'Show weather forecasts based on user location.',
  'privacy-policy': 'Auto-generated privacy policy page.',
  'custom-page': 'Create custom HTML pages for any content.',
  'website-to-app': 'Wrap any website as a full-screen app.',
  'source-code': 'Embed custom HTML, CSS, and JavaScript code.',
  'iframe': 'Embed external content like maps or dashboards.',
  'my-account': 'User authentication with sign-in and profile.'
};

export default function Build() {
  const { app, features, loading: appLoading, updateApp, refetch } = useAppFeatures();
  const { settings, updateSettings } = useAppSettings();
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [editingFeature, setEditingFeature] = useState<AppFeature | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Design state
  const [showDesignPanel, setShowDesignPanel] = useState(false);
  const [appName, setAppName] = useState('');
  const [themeColor, setThemeColor] = useState('#B8956B');
  const [backgroundColor, setBackgroundColor] = useState('#0D0F1A');

  useEffect(() => {
    if (app) {
      setAppName(settings?.app_name ?? app.name ?? '');
      setThemeColor(settings?.primary_color ?? app.theme_color ?? '#B8956B');
      setBackgroundColor(settings?.background_color ?? app.background_color ?? '#0D0F1A');
    }
  }, [app, settings]);

  const handleAddFeature = async (feature: Feature) => {
    if (!supabase || !app) return;
    setSaving(true);

    const { error } = await supabase.from('app_features').insert({
      app_id: app.id,
      feature_type: feature.id,
      name: feature.name,
      icon: feature.icon,
      position: features.length,
      is_enabled: true
    });

    if (!error) {
      refetch();
      setShowAddFeature(false);
    }
    setSaving(false);
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!supabase) return;
    await supabase.from('app_features').delete().eq('id', featureId);
    refetch();
  };

  const handleToggleFeature = async (featureId: string, enabled: boolean) => {
    if (!supabase) return;
    await supabase.from('app_features').update({ is_enabled: enabled }).eq('id', featureId);
    refetch();
  };

  const handleSaveDesign = async () => {
    setSaving(true);

    // Update app_settings
    await updateSettings({
      app_name: appName,
      primary_color: themeColor,
      theme_color: themeColor,
      background_color: backgroundColor
    });

    // Update legacy app table too for compatibility
    if (app) {
      await updateApp({
        name: appName,
        theme_color: themeColor,
        background_color: backgroundColor
      });
    }

    setSaving(false);
    setShowDesignPanel(false);
  };

  const filteredFeatures = FEATURES.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || f.category === selectedCategory;
    const notAdded = !features.some((af) => af.feature_type === f.id);
    return matchesSearch && matchesCategory && notAdded;
  });

  if (appLoading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_e8043363f0" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  return (
    <AppLayout>
      <div data-ev-id="build_page" className="flex h-full">
        {/* Features Panel */}
        <div data-ev-id="ev_1e21571f5b" className="flex-1 p-4 sm:p-8 overflow-auto">
          {/* Header */}
          <div data-ev-id="ev_c6142dafbf" className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div data-ev-id="ev_615ccfdb30">
              <h1 data-ev-id="ev_8b36438f00" className="text-[28px] font-display font-bold text-text tracking-tight">Build</h1>
              <p data-ev-id="ev_64f7ac545f" className="text-text-secondary mt-1">Add features and customize your app</p>
            </div>
            <div data-ev-id="ev_37149f3fbe" className="flex gap-3">
              <button data-ev-id="ev_ca1980071e"
              onClick={() => setShowDesignPanel(true)}
              className="bg-surface-raised hover:bg-border-strong text-text font-medium px-4 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] border border-border">

                <Palette className="w-4 h-4" />
                Design
              </button>
              <button data-ev-id="ev_6dff913a55"
              onClick={() => setShowAddFeature(true)}
              className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px]">

                <Plus className="w-4 h-4" />
                Add feature
              </button>
            </div>
          </div>

          {/* Features List */}
          {features.length === 0 ?
          <div data-ev-id="ev_d8f173d5ba" className="bg-card border border-border rounded-[16px] p-12 text-center">
              <Layers className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p data-ev-id="ev_f997a8b4ce" className="text-text-secondary">No features yet</p>
              <p data-ev-id="ev_c2225efccb" className="text-text-tertiary text-sm mt-1">Add your first feature to get started</p>
              <button data-ev-id="ev_30e928a570"
            onClick={() => setShowAddFeature(true)}
            className="mt-4 bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] inline-flex items-center gap-2 transition-colors min-h-[44px]">

                <Plus className="w-4 h-4" />
                Add feature
              </button>
            </div> :

          <div data-ev-id="ev_1b394f71a7" className="bg-card border border-border rounded-[16px] overflow-hidden">
              <div data-ev-id="ev_8bfb8f737b" className="p-5 border-b border-border">
                <h2 data-ev-id="ev_fc16b44e42" className="text-lg font-display font-bold text-text">Features ({features.length})</h2>
              </div>
              <div data-ev-id="ev_6c6aa96800" className="divide-y divide-border">
                {features.map((feature) => {
                const IconComponent = iconMap[feature.icon] || Layers;
                return (
                  <div data-ev-id="ev_6d1358be42" key={feature.id} className="p-5 flex items-center gap-4">
                      <div data-ev-id="ev_afbbe7b052"
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                    style={{ backgroundColor: (themeColor ?? '#B8956B') + '20' }}>

                        <IconComponent className="w-6 h-6" style={{ color: themeColor ?? '#B8956B' }} />
                      </div>
                      <div data-ev-id="ev_f6cee02bb0" className="flex-1 min-w-0">
                        <p data-ev-id="ev_1370b700d1" className="font-medium text-text">{feature.name}</p>
                        <p data-ev-id="ev_9d2c75c731" className="text-sm text-text-secondary">
                          {FEATURE_DESCRIPTIONS[feature.feature_type] || feature.feature_type}
                        </p>
                      </div>
                      <div data-ev-id="ev_dc9461e1e1" className="flex items-center gap-2">
                        <button data-ev-id="ev_41fe95eb39"
                      onClick={() => handleToggleFeature(feature.id, !feature.is_enabled)}
                      className={`p-2.5 rounded-[8px] transition-colors ${
                      feature.is_enabled ?
                      'text-success hover:bg-success/10' :
                      'text-text-tertiary hover:bg-surface-elevated'}`
                      }
                      title={feature.is_enabled ? 'Disable' : 'Enable'}>

                          {feature.is_enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                        <button data-ev-id="ev_55a1ab603b"
                      onClick={() => setEditingFeature(feature)}
                      className="p-2.5 text-text-tertiary hover:text-text rounded-[8px] hover:bg-surface-elevated transition-colors"
                      title="Settings">

                          <Settings className="w-5 h-5" />
                        </button>
                        <button data-ev-id="ev_433b5c3709"
                      onClick={() => handleDeleteFeature(feature.id)}
                      className="p-2.5 text-text-tertiary hover:text-destructive rounded-[8px] hover:bg-destructive/10 transition-colors"
                      title="Delete">

                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>);

              })}
              </div>
            </div>
          }
        </div>

        {/* Phone Preview */}
        <div data-ev-id="ev_3d74767357" className="hidden lg:flex w-[400px] bg-surface border-l border-border p-8 items-center justify-center">
          {app && <PhonePreview app={app} features={features} />}
        </div>

        {/* Add Feature Modal */}
        {showAddFeature &&
        <div data-ev-id="ev_a005db0338" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_499a80e27f" className="bg-card border border-border rounded-[16px] w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div data-ev-id="ev_fb2c9fab10" className="p-5 border-b border-border flex items-center justify-between">
                <h2 data-ev-id="ev_6ef6f239cd" className="text-[22px] font-display font-bold text-text tracking-tight">Add feature</h2>
                <button data-ev-id="ev_0dcd9df074"
              onClick={() => setShowAddFeature(false)}
              className="p-2 text-text-tertiary hover:text-text rounded-[8px]">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_5e897245cb" className="p-5 border-b border-border">
                <div data-ev-id="ev_e2803e9e66" className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                  <input data-ev-id="ev_2bc2050114"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full bg-input border border-border rounded-[10px] pl-12 pr-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />

                </div>
                <div data-ev-id="ev_48f15b59e5" className="flex gap-2 mt-4 flex-wrap">
                  <button data-ev-id="ev_10d934784a"
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory ? 'bg-primary text-white' : 'bg-surface-raised text-text-secondary hover:text-text'}`
                }>

                    All
                  </button>
                  {FEATURE_CATEGORIES.map((cat) =>
                <button data-ev-id="ev_12e477813c"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id ?
                'bg-primary text-white' :
                'bg-surface-raised text-text-secondary hover:text-text'}`
                }>

                      {cat.label}
                    </button>
                )}
                </div>
              </div>

              <div data-ev-id="ev_c65b563736" className="flex-1 overflow-auto p-5">
                <div data-ev-id="ev_632d961252" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFeatures.map((feature) => {
                  const IconComponent = iconMap[feature.icon] || Layers;
                  return (
                    <button data-ev-id="ev_21e142512e"
                    key={feature.id}
                    onClick={() => handleAddFeature(feature)}
                    disabled={saving}
                    className="p-4 bg-surface-raised hover:bg-border rounded-[12px] text-left transition-colors disabled:opacity-50">

                        <div data-ev-id="ev_4f397b4055" className="flex items-center gap-3 mb-2">
                          <IconComponent className="w-5 h-5 text-primary" />
                          <span data-ev-id="ev_0374921c65" className="font-medium text-text">{feature.name}</span>
                        </div>
                        <p data-ev-id="ev_b4ec377d07" className="text-sm text-text-secondary line-clamp-2">
                          {FEATURE_DESCRIPTIONS[feature.id] || feature.description}
                        </p>
                      </button>);

                })}
                </div>
              </div>
            </div>
          </div>
        }

        {/* Design Panel Modal */}
        {showDesignPanel &&
        <div data-ev-id="ev_b517a2a698" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_21d3d6f0de" className="bg-card border border-border rounded-[16px] w-full max-w-md p-5 sm:p-7">
              <div data-ev-id="ev_b06976c777" className="flex items-center justify-between mb-5">
                <h2 data-ev-id="ev_b34bca3b42" className="text-[22px] font-display font-bold text-text tracking-tight">Design</h2>
                <button data-ev-id="ev_313ea9cb3e"
              onClick={() => setShowDesignPanel(false)}
              className="p-2 text-text-tertiary hover:text-text rounded-[8px]">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_fe39d32c43" className="flex flex-col gap-5">
                <div data-ev-id="ev_c97c8481a6">
                  <label data-ev-id="ev_b2aaf0891c" className="block text-sm font-medium text-text mb-2">App name</label>
                  <input data-ev-id="ev_714a020f78"
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary" />

                </div>

                <div data-ev-id="ev_94a36e96cc">
                  <label data-ev-id="ev_a080d3829b" className="block text-sm font-medium text-text mb-2">Primary color</label>
                  <div data-ev-id="ev_f025c727e0" className="flex items-center gap-3">
                    <input data-ev-id="ev_f65cde5987"
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-12 h-12 rounded-[10px] border border-border cursor-pointer" />

                    <input data-ev-id="ev_1d8d443684"
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="flex-1 bg-input border border-border rounded-[10px] px-4 py-3 text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>
                </div>

                <div data-ev-id="ev_c4d173857b">
                  <label data-ev-id="ev_4ff052961e" className="block text-sm font-medium text-text mb-2">Background color</label>
                  <div data-ev-id="ev_a165eeede3" className="flex items-center gap-3">
                    <input data-ev-id="ev_946808fc75"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-12 rounded-[10px] border border-border cursor-pointer" />

                    <input data-ev-id="ev_43ebac0dbe"
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 bg-input border border-border rounded-[10px] px-4 py-3 text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary" />

                  </div>
                </div>

                <div data-ev-id="ev_4effe322d4" className="flex gap-3 mt-2">
                  <button data-ev-id="ev_0a9e01571a"
                onClick={() => setShowDesignPanel(false)}
                className="flex-1 bg-surface-raised hover:bg-border-strong text-text font-medium py-2.5 px-4 rounded-[10px] transition-colors min-h-[44px] border border-border">

                    Cancel
                  </button>
                  <button data-ev-id="ev_f31386c964"
                onClick={handleSaveDesign}
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]">

                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        {/* Feature Settings Modal */}
        {editingFeature && app &&
        <FeatureSettingsModal
          app={app}
          feature={editingFeature}
          onClose={() => setEditingFeature(null)}
          onUpdate={() => {
            refetch();
            setEditingFeature(null);
          }} />

        }
      </div>
    </AppLayout>);

}
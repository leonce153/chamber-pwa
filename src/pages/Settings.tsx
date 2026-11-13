import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Loader2,
  Settings as SettingsIcon,
  Users,
  Mail,
  Globe,
  Palette,
  Bell,
  Shield,
  ChevronRight,
  Save,
  AlertCircle,
  Check,
  CloudSun } from
'lucide-react';

export default function Settings() {
  const { isOwner } = useAuth();
  const { settings, loading, updateSettings } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [appName, setAppName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [embedPortalPages, setEmbedPortalPages] = useState(false);

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name ?? '');
      setShortName(settings.short_name ?? '');
      setDescription(settings.description ?? '');
      setContactEmail(settings.contact_email ?? '');
      setSubdomain(settings.subdomain ?? '');
      setWeatherEnabled(settings.weather_enabled ?? true);
      setEmbedPortalPages(settings.embed_portal_pages ?? false);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!isOwner) return;
    setSaving(true);
    setError(null);

    const result = await updateSettings({
      app_name: appName,
      short_name: shortName,
      description,
      contact_email: contactEmail,
      subdomain: subdomain || null,
      weather_enabled: weatherEnabled,
      embed_portal_pages: embedPortalPages
    });

    if (!result.error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_e8c2b0ba59" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  return (
    <AppLayout>
      <div data-ev-id="settings_page" className="p-8 max-w-4xl">
        {/* Header */}
        <div data-ev-id="ev_e2aeedac1a" className="flex items-center justify-between mb-8">
          <div data-ev-id="ev_15878221cf">
            <h1 data-ev-id="ev_53dcb41e4a" className="text-[28px] font-display font-bold text-text tracking-tight">Settings</h1>
            <p data-ev-id="ev_b7f2b71b36" className="text-text-secondary mt-1">Manage your app configuration</p>
          </div>
          {isOwner &&
          <button data-ev-id="ev_d259372ed2"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] disabled:opacity-50">

              {saving ?
            <Loader2 className="w-4 h-4 animate-spin" /> :
            saved ?
            <Check className="w-4 h-4" /> :

            <Save className="w-4 h-4" />
            }
              {saved ? 'Saved!' : 'Save changes'}
            </button>
          }
        </div>

        {error &&
        <div data-ev-id="ev_c3a0fa2d17" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p data-ev-id="ev_3a3e3607e8" className="text-sm text-destructive">{error}</p>
          </div>
        }

        {/* Quick Links */}
        <div data-ev-id="ev_d9e21658e2" className="grid grid-cols-2 gap-4 mb-8">
          <Link data-ev-id="ev_3d7421c9a0"
          to="/admin/team"
          className="bg-card border border-border rounded-[16px] p-5 flex items-center gap-4 hover:bg-surface-elevated transition-colors">

            <div data-ev-id="ev_9c3a017fc7" className="w-12 h-12 rounded-[12px] bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div data-ev-id="ev_49b8ed5e1b" className="flex-1">
              <p data-ev-id="ev_0045e8f3ae" className="font-semibold text-text">Team</p>
              <p data-ev-id="ev_f2a64945c5" className="text-sm text-text-secondary">Manage team members and roles</p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary" />
          </Link>

          <Link data-ev-id="ev_528ed688fd"
          to="/admin/build"
          className="bg-card border border-border rounded-[16px] p-5 flex items-center gap-4 hover:bg-surface-elevated transition-colors">

            <div data-ev-id="ev_08c0c8827a" className="w-12 h-12 rounded-[12px] bg-accent/10 flex items-center justify-center">
              <Palette className="w-6 h-6 text-accent" />
            </div>
            <div data-ev-id="ev_e8ed39ce7a" className="flex-1">
              <p data-ev-id="ev_e165256c25" className="font-semibold text-text">Design & Branding</p>
              <p data-ev-id="ev_bbbb3fec27" className="text-sm text-text-secondary">Colors, logo, and visual identity</p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary" />
          </Link>
        </div>

        {/* General Settings */}
        <div data-ev-id="ev_66784e3a03" className="bg-card border border-border rounded-[16px] overflow-hidden mb-6">
          <div data-ev-id="ev_76756f830f" className="p-5 border-b border-border flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-text-tertiary" />
            <h2 data-ev-id="ev_9e185fc123" className="text-lg font-display font-bold text-text">General</h2>
          </div>

          <div data-ev-id="ev_e37c050e8d" className="p-6 flex flex-col gap-5">
            <div data-ev-id="ev_2251d5469f">
              <label data-ev-id="ev_56c58d1dac" className="block text-sm font-medium text-text mb-2">App name</label>
              <input data-ev-id="ev_8b37d9e404"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              disabled={!isOwner}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />

            </div>

            <div data-ev-id="ev_f2041cc46f">
              <label data-ev-id="ev_b8c79eb693" className="block text-sm font-medium text-text mb-2">Short name (for home screen)</label>
              <input data-ev-id="ev_08df95c64e"
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              disabled={!isOwner}
              maxLength={12}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />

              <p data-ev-id="ev_c7ed1f70f6" className="text-xs text-text-tertiary mt-1">Max 12 characters</p>
            </div>

            <div data-ev-id="ev_7d8f3604fb">
              <label data-ev-id="ev_6d78b094c4" className="block text-sm font-medium text-text mb-2">Description</label>
              <textarea data-ev-id="ev_61ad7bd8c8"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner}
              rows={3}
              className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50" />

            </div>
          </div>
        </div>

        {/* Domain Settings */}
        <div data-ev-id="ev_3d60412f50" className="bg-card border border-border rounded-[16px] overflow-hidden mb-6">
          <div data-ev-id="ev_ed55c72f78" className="p-5 border-b border-border flex items-center gap-3">
            <Globe className="w-5 h-5 text-text-tertiary" />
            <h2 data-ev-id="ev_fa8da67bb0" className="text-lg font-display font-bold text-text">Domain</h2>
          </div>

          <div data-ev-id="ev_bba3a9f0a8" className="p-6 flex flex-col gap-5">
            <div data-ev-id="ev_c9fc4f6629">
              <label data-ev-id="ev_a934d27d47" className="block text-sm font-medium text-text mb-2">Subdomain</label>
              <div data-ev-id="ev_4a8d2c1b75" className="flex items-center gap-2">
                <input data-ev-id="ev_fed197b051"
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={!isOwner}
                placeholder="myapp"
                className="flex-1 bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />

                <span data-ev-id="ev_6ae053756c" className="text-text-secondary">.yourdomain.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weather */}
        <div data-ev-id="ev_settings_weather" className="bg-card border border-border rounded-[16px] overflow-hidden mb-6">
          <div data-ev-id="ev_settings_weather_head" className="p-5 border-b border-border flex items-center gap-3">
            <CloudSun className="w-5 h-5 text-text-tertiary" />
            <h2 data-ev-id="ev_settings_weather_title" className="text-lg font-display font-bold text-text">Weather</h2>
          </div>
          <div data-ev-id="ev_settings_weather_body" className="p-6 flex items-center justify-between gap-4">
            <div data-ev-id="ev_settings_weather_text">
              <p data-ev-id="ev_settings_weather_label" className="font-medium text-text">Show weather on the Home screen</p>
              <p data-ev-id="ev_settings_weather_desc" className="text-sm text-text-secondary mt-1">
                Muleshoe, TX forecast and alerts from the National Weather Service, in °F and mph.
              </p>
            </div>
            <button data-ev-id="ev_settings_weather_toggle"
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            disabled={!isOwner}
            role="switch"
            aria-checked={weatherEnabled}
            aria-label="Show weather on the Home screen"
            className={`relative w-12 h-7 shrink-0 rounded-full transition-colors disabled:opacity-50 ${weatherEnabled ? 'bg-primary' : 'bg-border-strong'}`}>
              <span data-ev-id="ev_settings_weather_knob" className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${weatherEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Portal pages */}
        <div data-ev-id="ev_settings_embed" className="bg-card border border-border rounded-[16px] overflow-hidden mb-6">
          <div data-ev-id="ev_settings_embed_head" className="p-5 border-b border-border flex items-center gap-3">
            <Globe className="w-5 h-5 text-text-tertiary" />
            <h2 data-ev-id="ev_settings_embed_title" className="text-lg font-display font-bold text-text">Portal pages</h2>
          </div>
          <div data-ev-id="ev_settings_embed_body" className="p-6 flex items-center justify-between gap-4">
            <div data-ev-id="ev_settings_embed_text">
              <p data-ev-id="ev_settings_embed_label" className="font-medium text-text">Open portal pages inside the app</p>
              <p data-ev-id="ev_settings_embed_desc" className="text-sm text-text-secondary mt-1 text-pretty">
                When off, Directory, Events, Ask the Mule and Home quick links open the portal in the browser.
              </p>
            </div>
            <button data-ev-id="ev_settings_embed_toggle"
            onClick={() => setEmbedPortalPages(!embedPortalPages)}
            disabled={!isOwner}
            role="switch"
            aria-checked={embedPortalPages}
            aria-label="Open portal pages inside the app"
            className={`relative w-12 h-7 shrink-0 rounded-full transition-colors disabled:opacity-50 ${embedPortalPages ? 'bg-primary' : 'bg-border-strong'}`}>
              <span data-ev-id="ev_settings_embed_knob" className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${embedPortalPages ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Contact Settings */}
        <div data-ev-id="ev_8619e7c734" className="bg-card border border-border rounded-[16px] overflow-hidden">
          <div data-ev-id="ev_e08fd4d721" className="p-5 border-b border-border flex items-center gap-3">
            <Mail className="w-5 h-5 text-text-tertiary" />
            <h2 data-ev-id="ev_50c6a4e129" className="text-lg font-display font-bold text-text">Contact</h2>
          </div>

          <div data-ev-id="ev_c9f44263cf" className="p-6">
            <div data-ev-id="ev_a95934f088">
              <label data-ev-id="ev_e28b2fe7ef" className="block text-sm font-medium text-text mb-2">Contact email</label>
              <input data-ev-id="ev_e01b5ff166"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={!isOwner}
              placeholder="support@example.com"
              className="w-full bg-input border border-border rounded-[10px] px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />

            </div>
          </div>
        </div>

        {/* Editor Notice */}
        {!isOwner &&
        <div data-ev-id="ev_7197377737" className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-[12px]">
            <p data-ev-id="ev_e932e7097f" className="text-sm text-warning">
              <strong data-ev-id="ev_c36625b8c5">Editor access:</strong> You can view settings but cannot make changes. Contact an Owner to update settings.
            </p>
          </div>
        }
      </div>
    </AppLayout>);

}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureSettingsProps, WebsitesSettingsData, LinkItemData } from './types';
import { LinkEditor } from './LinkEditor';
import {
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Search,
  Check,
  Upload,
  List,
  LayoutGrid,
  ExternalLink,
  Globe,
  Loader2 } from
'lucide-react';

interface FeatureLinkRow {
  id: string;
  feature_id: string;
  title: string;
  url: string;
  icon_url: string | null;
  open_mode: string | null;
  show_progress_bar: boolean | null;
  enable_pull_refresh: boolean | null;
  allow_downloads: boolean | null;
  remember_session: boolean | null;
  custom_user_agent: string | null;
  inject_cookies: string | null;
  custom_headers: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}

export function WebsitesSettings({ app, feature, settings, onUpdateSettings }: FeatureSettingsProps) {
  const [links, setLinks] = useState<FeatureLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<FeatureLinkRow | null>(null);
  const [showAddLink, setShowAddLink] = useState(false);

  const websiteSettings: WebsitesSettingsData = {
    theme: settings.theme as WebsitesSettingsData['theme'] ?? 'list',
    layout: settings.layout as WebsitesSettingsData['layout'] ?? 'list',
    enableSearch: settings.enableSearch as boolean ?? true,
    coverImageUrl: settings.coverImageUrl as string | undefined,
    colors: settings.colors as WebsitesSettingsData['colors'] ?? {}
  };

  useEffect(() => {
    const loadLinks = async () => {
      if (!supabase) return;
      
      const { data } = await supabase
        .from('feature_links')
        .select('*')
        .eq('feature_id', feature.id)
        .order('position');
      
      setLinks((data as FeatureLinkRow[]) ?? []);
      setLoading(false);
    };
    loadLinks();
  }, [feature.id]);

  const fetchLinks = async () => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_links').
    select('*').
    eq('feature_id', feature.id).
    order('position');

    setLinks(data as FeatureLinkRow[] ?? []);
    setLoading(false);
  };

  const addLink = async (linkData: LinkItemData) => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_links').
    insert({
      feature_id: feature.id,
      title: linkData.title,
      url: linkData.url,
      icon_url: linkData.iconUrl,
      open_mode: linkData.openMode,
      show_progress_bar: linkData.showProgressBar,
      enable_pull_refresh: linkData.enablePullRefresh,
      allow_downloads: linkData.allowDownloads,
      remember_session: linkData.rememberSession,
      custom_user_agent: linkData.customUserAgent,
      inject_cookies: linkData.injectCookies,
      custom_headers: linkData.customHeaders,
      position: links.length
    }).
    select().
    single();

    if (data) {
      setLinks([...links, data as FeatureLinkRow]);
      setShowAddLink(false);
    }
  };

  const updateLink = async (linkId: string, linkData: LinkItemData) => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_links').
    update({
      title: linkData.title,
      url: linkData.url,
      icon_url: linkData.iconUrl,
      open_mode: linkData.openMode,
      show_progress_bar: linkData.showProgressBar,
      enable_pull_refresh: linkData.enablePullRefresh,
      allow_downloads: linkData.allowDownloads,
      remember_session: linkData.rememberSession,
      custom_user_agent: linkData.customUserAgent,
      inject_cookies: linkData.injectCookies,
      custom_headers: linkData.customHeaders
    }).
    eq('id', linkId).
    select().
    single();

    if (data) {
      setLinks(links.map((l) => l.id === linkId ? data as FeatureLinkRow : l));
      setEditingLink(null);
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!supabase || !confirm('Delete this link?')) return;

    await supabase.from('feature_links').delete().eq('id', linkId);
    setLinks(links.filter((l) => l.id !== linkId));
  };

  const themes = [
  { id: 'list', name: 'List', description: 'Clean & minimal' },
  { id: 'grid', name: 'Grid', description: 'Bold card layout' },
  { id: 'capsule', name: 'Capsule', description: 'Bio-link style' },
  { id: 'glass', name: 'Glass', description: 'Frosted & modern' }] as
  const;

  return (
    <div data-ev-id="ev_105870f92f" className="p-6 flex flex-col gap-8">
      {/* Layout & Theme */}
      <section data-ev-id="ev_af315ed141">
        <h3 data-ev-id="ev_8fb80c20a9" className="text-lg font-semibold text-text mb-2">Layout & Theme</h3>
        <p data-ev-id="ev_5f972ec91d" className="text-sm text-muted mb-4">Choose the visual layout for the mobile link list.</p>
        
        <div data-ev-id="ev_8ba0b0a8db" className="grid grid-cols-2 gap-4">
          {themes.map((theme) =>
          <button data-ev-id="ev_50582330ca"
          key={theme.id}
          onClick={() => onUpdateSettings({ theme: theme.id })}
          className={`relative p-4 rounded-xl border-2 text-left transition-colors ${
          websiteSettings.theme === theme.id ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

              <div data-ev-id="ev_7cff2537b2" className="h-24 bg-surface-elevated rounded-lg mb-3 flex items-center justify-center">
                {theme.id === 'list' &&
              <div data-ev-id="ev_6f4aa88e08" className="w-full px-4 flex flex-col gap-2">
                    {[1, 2, 3].map((i) =>
                <div data-ev-id="ev_19d6050a0a" key={i} className="h-3 bg-primary/30 rounded-full" />
                )}
                  </div>
              }
                {theme.id === 'grid' &&
              <div data-ev-id="ev_aef08465d2" className="grid grid-cols-3 gap-2 p-2">
                    {[1, 2, 3, 4, 5, 6].map((i) =>
                <div data-ev-id="ev_1b89e732c0" key={i} className="w-6 h-6 bg-primary/30 rounded" />
                )}
                  </div>
              }
                {theme.id === 'capsule' &&
              <div data-ev-id="ev_01ef8d5923" className="w-full px-4 flex flex-col gap-2">
                    {[1, 2].map((i) =>
                <div data-ev-id="ev_6d336d7fe2" key={i} className="h-8 bg-gradient-to-r from-primary/40 to-primary/20 rounded-full" />
                )}
                  </div>
              }
                {theme.id === 'glass' &&
              <div data-ev-id="ev_9677efc0d2" className="w-full px-4 flex flex-col gap-2">
                    {[1, 2].map((i) =>
                <div data-ev-id="ev_b29d0c97f7" key={i} className="h-6 bg-white/20 backdrop-blur rounded-lg border border-white/10" />
                )}
                  </div>
              }
              </div>
              <div data-ev-id="ev_a228a0a02b" className="flex items-center justify-between">
                <div data-ev-id="ev_4b7745848b">
                  <p data-ev-id="ev_386747e475" className="font-medium text-text">{theme.name}</p>
                  <p data-ev-id="ev_e48f2c6aa4" className="text-xs text-muted">{theme.description}</p>
                </div>
                {websiteSettings.theme === theme.id &&
              <Check className="w-5 h-5 text-primary" />
              }
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Layout */}
      <section data-ev-id="ev_ce65fb73c9">
        <h3 data-ev-id="ev_664da9053a" className="text-lg font-semibold text-text mb-2">Layout</h3>
        <p data-ev-id="ev_c217cd8657" className="text-sm text-muted mb-4">Choose how links are arranged in the mobile view.</p>
        
        <div data-ev-id="ev_423096f985" className="flex gap-3">
          <button data-ev-id="ev_cea7006eff"
          onClick={() => onUpdateSettings({ layout: 'list' })}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors ${
          websiteSettings.layout === 'list' ?
          'border-primary bg-primary/10 text-primary' :
          'border-border text-muted hover:border-primary/50'}`
          }>

            <List className="w-5 h-5" />
            <span data-ev-id="ev_3a53a59aff" className="font-medium">List</span>
          </button>
          <button data-ev-id="ev_25498fdc95"
          onClick={() => onUpdateSettings({ layout: 'grid' })}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-colors ${
          websiteSettings.layout === 'grid' ?
          'border-primary bg-primary/10 text-primary' :
          'border-border text-muted hover:border-primary/50'}`
          }>

            <LayoutGrid className="w-5 h-5" />
            <span data-ev-id="ev_f0b4fc872e" className="font-medium">Grid</span>
          </button>
        </div>
      </section>

      {/* Custom Colors */}
      <section data-ev-id="ev_43e05fc7f1">
        <h3 data-ev-id="ev_a6992d9b92" className="text-lg font-semibold text-text mb-2">Custom Colors</h3>
        <p data-ev-id="ev_941d7c1775" className="text-sm text-muted mb-4">Override the selected theme colors. Leave empty to use theme defaults.</p>
        
        <div data-ev-id="ev_6e04a1e5c2" className="grid grid-cols-2 gap-4">
          {[
          { key: 'background', label: 'Background' },
          { key: 'surface', label: 'Surface / Cards' },
          { key: 'accentStart', label: 'Accent Start' },
          { key: 'accentEnd', label: 'Accent End' },
          { key: 'text', label: 'Text' },
          { key: 'headerBackground', label: 'Header Background' },
          { key: 'headerText', label: 'Header Text' },
          { key: 'headerIcons', label: 'Header Icons' }].
          map(({ key, label }) =>
          <div data-ev-id="ev_d539a2e84c" key={key}>
              <label data-ev-id="ev_fc600e1424" className="block text-sm font-medium text-text mb-1.5">{label}</label>
              <div data-ev-id="ev_e95034ac80" className="flex items-center gap-2">
                <input data-ev-id="ev_7f79d687f3"
              type="color"
              value={(websiteSettings.colors as Record<string, string>)?.[key] || '#ffffff'}
              onChange={(e) => onUpdateSettings({
                colors: { ...websiteSettings.colors, [key]: e.target.value }
              })}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer" />

                <input data-ev-id="ev_eda1feb506"
              type="text"
              value={(websiteSettings.colors as Record<string, string>)?.[key] || ''}
              onChange={(e) => onUpdateSettings({
                colors: { ...websiteSettings.colors, [key]: e.target.value }
              })}
              placeholder="#FFFFFF"
              className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted" />

                <button data-ev-id="ev_622097ef1d"
              onClick={() => {
                const newColors = { ...websiteSettings.colors };
                delete (newColors as Record<string, string>)[key];
                onUpdateSettings({ colors: newColors });
              }}
              className="px-3 py-2 text-sm text-muted hover:text-text bg-surface-elevated rounded-lg">

                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* List Settings */}
      <section data-ev-id="ev_1a799586cd">
        <h3 data-ev-id="ev_25e6dbf2d9" className="text-lg font-semibold text-text mb-2">List Settings</h3>
        
        <label data-ev-id="ev_5cb1e2e60c" className="flex items-center gap-3 cursor-pointer">
          <div data-ev-id="ev_5cd372dde2"
          onClick={() => onUpdateSettings({ enableSearch: !websiteSettings.enableSearch })}
          className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
          websiteSettings.enableSearch ? 'bg-primary' : 'bg-surface-elevated'}`
          }>

            <div data-ev-id="ev_8dec292f6c"
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            websiteSettings.enableSearch ? 'translate-x-7' : 'translate-x-1'}`
            } />

          </div>
          <span data-ev-id="ev_d0ab7de4b7" className="text-text">Enable Search</span>
        </label>
      </section>

      {/* Cover Image */}
      <section data-ev-id="ev_0af8f022de">
        <h3 data-ev-id="ev_39be9bfbeb" className="text-lg font-semibold text-text mb-2">Cover Image</h3>
        <p data-ev-id="ev_0d3bad32ee" className="text-sm text-muted mb-4">Optional cover image displayed at the top of the links list (1000x600 recommended).</p>
        
        <button data-ev-id="ev_ef86790c7d" className="flex items-center gap-2 px-4 py-2.5 bg-surface-elevated hover:bg-border text-text font-medium rounded-lg border border-border transition-colors">
          <Upload className="w-5 h-5" />
          Upload Cover
        </button>
      </section>

      {/* Links */}
      <section data-ev-id="ev_d418c5122d">
        <div data-ev-id="ev_42dd3cf374" className="flex items-center justify-between mb-4">
          <h3 data-ev-id="ev_17337be894" className="text-lg font-semibold text-text">Links</h3>
          <button data-ev-id="ev_88c725666b"
          onClick={() => setShowAddLink(true)}
          className="flex items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 text-white font-medium rounded-lg transition-colors">

            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>

        {loading ?
        <div data-ev-id="ev_5aabe80a3e" className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div> :
        links.length === 0 ?
        <div data-ev-id="ev_03f30b677d" className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
            <Globe className="w-12 h-12 text-muted mx-auto mb-3" />
            <p data-ev-id="ev_3219ca6a26" className="text-text font-medium mb-1">No links yet</p>
            <p data-ev-id="ev_e30d77e20d" className="text-sm text-muted">Add your first link to get started</p>
          </div> :

        <div data-ev-id="ev_21ca292d2a" className="flex flex-col gap-3">
            {links.map((link) =>
          <div data-ev-id="ev_f8516031c7"
          key={link.id}
          className="bg-surface-elevated border border-border rounded-xl p-4">

                <div data-ev-id="ev_9d18ae74c6" className="flex items-center gap-4">
                  <button data-ev-id="ev_e6f843248d" className="text-muted hover:text-text cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </button>
                  
                  <div data-ev-id="ev_ec62e2717b" className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    {link.icon_url ?
                <img data-ev-id="ev_3936ed7b87" src={link.icon_url} alt="" className="w-6 h-6 rounded" /> :

                <Globe className="w-5 h-5 text-primary" />
                }
                  </div>

                  <div data-ev-id="ev_cea7545a5c" className="flex-1 min-w-0">
                    <p data-ev-id="ev_0b99fdcb7d" className="font-medium text-text truncate">{link.title}</p>
                    <p data-ev-id="ev_47b0e8aa8a" className="text-sm text-muted truncate">{link.url}</p>
                  </div>

                  <span data-ev-id="ev_811348d8c2" className="text-xs font-medium px-2 py-1 rounded bg-primary/20 text-primary">
                    {link.open_mode === 'in_app' ? 'In-App' : link.open_mode === 'custom_tab' ? 'Custom Tab' : 'External'}
                  </span>

                  <button data-ev-id="ev_3c6fa095ed"
              onClick={() => setEditingLink(link)}
              className="p-2 text-muted hover:text-text bg-background hover:bg-surface rounded-lg transition-colors">

                    <Settings className="w-4 h-4" />
                  </button>

                  <button data-ev-id="ev_954c2b111f"
              onClick={() => deleteLink(link.id)}
              className="p-2 text-muted hover:text-destructive bg-background hover:bg-destructive/10 rounded-lg transition-colors">

                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
          )}
          </div>
        }
      </section>

      {/* Add/Edit Link Modal */}
      {(showAddLink || editingLink) &&
      <LinkEditor
        link={editingLink ? {
          id: editingLink.id,
          title: editingLink.title,
          url: editingLink.url,
          iconUrl: editingLink.icon_url ?? undefined,
          openMode: editingLink.open_mode as 'in_app' | 'custom_tab' | 'external' ?? 'in_app',
          showProgressBar: editingLink.show_progress_bar ?? true,
          enablePullRefresh: editingLink.enable_pull_refresh ?? true,
          allowDownloads: editingLink.allow_downloads ?? false,
          rememberSession: editingLink.remember_session ?? false,
          customUserAgent: editingLink.custom_user_agent ?? undefined,
          injectCookies: editingLink.inject_cookies ?? undefined,
          customHeaders: editingLink.custom_headers ?? undefined
        } : undefined}
        onSave={(data) => {
          if (editingLink) {
            updateLink(editingLink.id, data);
          } else {
            addLink(data);
          }
        }}
        onClose={() => {
          setShowAddLink(false);
          setEditingLink(null);
        }} />

      }
    </div>);

}
import { useState, useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { supabase } from '@/integrations/supabase/client';
import {
  Globe,
  ExternalLink,
  Rss,
  FileText,
  CloudSun,
  Loader2,
  Link as LinkIcon,
  ChevronRight,
  ChevronLeft,
  User,
  MessageSquare,
  Music,
  Image,
  Gamepad2,
  Shield,
  Code,
  Facebook,
  RefreshCw,
  X,
  Building2,
  Calendar,
  MessageCircle,
  Users,
  Video,
  Newspaper,
  Award,
  Grid3x3,
  Share2,
  Monitor,
  Layers } from
'lucide-react';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;
type FeatureLink = Tables<'feature_links'>;
type FeatureRSSFeed = Tables<'feature_rss_feeds'>;
type FeatureCustomPage = Tables<'feature_custom_pages'>;

interface FeatureContentPreviewProps {
  app: App;
  feature: AppFeature;
  onOpenInAppBrowser?: (link: { title: string; url: string; show_progress_bar?: boolean | null }) => void;
}

export function FeatureContentPreview({ app, feature, onOpenInAppBrowser }: FeatureContentPreviewProps) {
  const [links, setLinks] = useState<FeatureLink[]>([]);
  const [rssFeeds, setRssFeeds] = useState<FeatureRSSFeed[]>([]);
  const [customPages, setCustomPages] = useState<FeatureCustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  // Only use internal state if no external handler provided
  const [activeInAppLink, setActiveInAppLink] = useState<FeatureLink | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);

  useEffect(() => {
    async function loadContent() {
      if (!supabase) return;
      setLoading(true);

      try {
        const featureType = feature.feature_type;

        if (featureType === 'websites' || featureType === 'links') {
          const { data } = await supabase.
          from('feature_links').
          select('*').
          eq('feature_id', feature.id).
          order('position', { ascending: true });
          setLinks(data ?? []);
        } else if (featureType === 'rss-feed') {
          const { data } = await supabase.
          from('feature_rss_feeds').
          select('*').
          eq('feature_id', feature.id).
          order('position', { ascending: true });
          setRssFeeds(data ?? []);
        } else if (featureType === 'custom-pages') {
          const { data } = await supabase.
          from('feature_custom_pages').
          select('*').
          eq('feature_id', feature.id).
          order('position', { ascending: true });
          setCustomPages(data ?? []);
        }
      } catch (err) {
        console.error('Error loading feature content:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [feature.id, feature.feature_type]);

  if (loading) {
    return (
      <div data-ev-id="ev_8e0c0750a2" className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: app.theme_color ?? '#B8956B' }} />
      </div>);

  }

  const featureType = feature.feature_type;

  // Handle link click based on open_mode
  const handleLinkClick = (link: FeatureLink, e: React.MouseEvent) => {
    e.preventDefault();
    const openMode = link.open_mode ?? 'in_app';

    if (openMode === 'in_app') {
      // If parent provides handler, use it (for proper overlay positioning)
      if (onOpenInAppBrowser) {
        onOpenInAppBrowser({
          title: link.title,
          url: link.url,
          show_progress_bar: link.show_progress_bar
        });
      } else {
        // Fallback to internal state
        setIframeLoading(true);
        setActiveInAppLink(link);
      }
    } else {
      // external or custom_tab - open in new window
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  // In-App Browser overlay
  if (activeInAppLink) {
    return (
      <div data-ev-id="ev_866fdbb7a5" className="absolute inset-0 flex flex-col bg-black z-30">
        {/* Browser toolbar */}
        <div data-ev-id="ev_fc7511c4de"
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{
          backgroundColor: app.background_color ?? '#0f172a',
          borderColor: (app.theme_color ?? '#B8956B') + '40'
        }}>

          <button data-ev-id="ev_3aefe0d0c5"
          onClick={() => setActiveInAppLink(null)}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10">

            <ChevronLeft className="w-5 h-5" style={{ color: app.text_color ?? '#ffffff' }} />
          </button>
          <div data-ev-id="ev_ddf0916bce" className="flex-1 min-w-0">
            <p data-ev-id="ev_7ea8b168cf" className="text-xs font-medium truncate" style={{ color: app.text_color ?? '#ffffff' }}>
              {activeInAppLink.title}
            </p>
            <p data-ev-id="ev_4a0194abc6" className="text-[10px] truncate opacity-60" style={{ color: app.text_color ?? '#ffffff' }}>
              {activeInAppLink.url}
            </p>
          </div>
          <button data-ev-id="ev_728b9b6d58"
          onClick={() => {
            setIframeLoading(true);
            const iframe = document.querySelector('#in-app-iframe') as HTMLIFrameElement;
            if (iframe) iframe.src = activeInAppLink.url;
          }}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10">

            <RefreshCw className="w-4 h-4" style={{ color: app.text_color ?? '#ffffff' }} />
          </button>
          <button data-ev-id="ev_ff571f2838"
          onClick={() => setActiveInAppLink(null)}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10">

            <X className="w-4 h-4" style={{ color: app.text_color ?? '#ffffff' }} />
          </button>
        </div>
        
        {/* Progress bar */}
        {iframeLoading && activeInAppLink.show_progress_bar !== false &&
        <div data-ev-id="ev_9f79e9d2e7"
        className="h-0.5 animate-pulse"
        style={{ backgroundColor: app.theme_color ?? '#B8956B' }} />

        }
        
        {/* Iframe content */}
        <div data-ev-id="ev_4dd9e62257" className="flex-1 relative bg-white">
          <iframe data-ev-id="ev_8fd81f5f3c"
          id="in-app-iframe"
          src={activeInAppLink.url}
          className="absolute inset-0 w-full h-full border-0"
          onLoad={() => setIframeLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={activeInAppLink.title} />

          {iframeLoading &&
          <div data-ev-id="ev_ab61966be0" className="absolute inset-0 flex items-center justify-center bg-white">
              <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: app.theme_color ?? '#B8956B' }} />

            </div>
          }
        </div>
      </div>);

  }

  // Websites/Links feature
  if (featureType === 'websites' || featureType === 'links') {
    if (links.length === 0) {
      return <EmptyState app={app} message="No links added yet. Add links in the feature settings." />;
    }

    return (
      <div data-ev-id="ev_c132e2f24c" className="flex flex-col gap-3">
        {links.map((link) =>
        <button data-ev-id="ev_72eb919306"
        key={link.id}
        onClick={(e) => handleLinkClick(link, e)}
        className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
        style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

            {link.icon_url ?
          <img data-ev-id="ev_6925445d83" src={link.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> :

          <div data-ev-id="ev_bb8e7cb984"
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '40' }}>

                <Globe className="w-5 h-5" style={{ color: app.theme_color ?? '#B8956B' }} />
              </div>
          }
            <div data-ev-id="ev_013244450d" className="flex-1 min-w-0">
              <p data-ev-id="ev_2f5808d177" className="font-medium truncate" style={{ color: app.text_color ?? '#ffffff' }}>
                {link.title}
              </p>
              <p data-ev-id="ev_5769e0242c" className="text-xs truncate opacity-60" style={{ color: app.text_color ?? '#ffffff' }}>
                {link.url}
              </p>
            </div>
            {link.open_mode === 'in_app' ?
          <ChevronRight className="w-4 h-4 opacity-50" style={{ color: app.text_color ?? '#ffffff' }} /> :

          <ExternalLink className="w-4 h-4 opacity-50" style={{ color: app.text_color ?? '#ffffff' }} />
          }
          </button>
        )}
      </div>);

  }

  // RSS Feed feature
  if (featureType === 'rss-feed') {
    if (rssFeeds.length === 0) {
      return <EmptyState app={app} message="No RSS feeds added yet. Add feeds in the feature settings." />;
    }

    return (
      <div data-ev-id="ev_57b9dcb6cb" className="flex flex-col gap-3">
        {rssFeeds.map((feed) =>
        <div data-ev-id="ev_fc882fbf8d"
        key={feed.id}
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

            <div data-ev-id="ev_be254d489f"
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '40' }}>

              <Rss className="w-5 h-5" style={{ color: app.theme_color ?? '#B8956B' }} />
            </div>
            <div data-ev-id="ev_883f2e712e" className="flex-1 min-w-0">
              <p data-ev-id="ev_d970278a55" className="font-medium truncate" style={{ color: app.text_color ?? '#ffffff' }}>
                {feed.title}
              </p>
              <p data-ev-id="ev_788cd6cee4" className="text-xs truncate opacity-60" style={{ color: app.text_color ?? '#ffffff' }}>
                {feed.max_items ?? 10} items • {feed.show_images ? 'With images' : 'Text only'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" style={{ color: app.text_color ?? '#ffffff' }} />
          </div>
        )}
      </div>);

  }

  // Custom Pages feature
  if (featureType === 'custom-pages') {
    if (customPages.length === 0) {
      return <EmptyState app={app} message="No custom pages added yet. Add pages in the feature settings." />;
    }

    return (
      <div data-ev-id="ev_633753e11d" className="flex flex-col gap-3">
        {customPages.map((page) =>
        <div data-ev-id="ev_e170602a4a"
        key={page.id}
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

            <div data-ev-id="ev_9ab46af751"
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '40' }}>

              <FileText className="w-5 h-5" style={{ color: app.theme_color ?? '#B8956B' }} />
            </div>
            <div data-ev-id="ev_c842c02eb0" className="flex-1 min-w-0">
              <p data-ev-id="ev_e604df85d3" className="font-medium truncate" style={{ color: app.text_color ?? '#ffffff' }}>
                {page.title}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" style={{ color: app.text_color ?? '#ffffff' }} />
          </div>
        )}
      </div>);

  }

  // Weather feature
  if (featureType === 'weather') {
    const settings = feature.settings as Record<string, unknown> ?? {};
    return (
      <div data-ev-id="ev_1c3d6dc900" className="text-center py-8">
        <CloudSun className="w-16 h-16 mx-auto mb-4" style={{ color: app.theme_color ?? '#B8956B' }} />
        <p data-ev-id="ev_3d28aa458a" className="text-2xl font-bold" style={{ color: app.text_color ?? '#ffffff' }}>72°F</p>
        <p data-ev-id="ev_ae57063308" className="opacity-60" style={{ color: app.text_color ?? '#ffffff' }}>
          {settings.default_location as string || 'New York, NY'}
        </p>
        <p data-ev-id="ev_cf3ead240b" className="text-sm mt-2 opacity-40" style={{ color: app.text_color ?? '#ffffff' }}>
          Weather data will be live in the published app
        </p>
      </div>);

  }

  // Social Media feature
  if (featureType === 'social-media') {
    return (
      <div data-ev-id="ev_6b06d0ae72" className="flex flex-col gap-3">
        {['Facebook', 'Twitter', 'Instagram', 'LinkedIn'].map((platform) =>
        <div data-ev-id="ev_901c885054"
        key={platform}
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

            <div data-ev-id="ev_519006dffa"
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '40' }}>

              <Facebook className="w-5 h-5" style={{ color: app.theme_color ?? '#B8956B' }} />
            </div>
            <p data-ev-id="ev_ef1a1b5462" className="font-medium" style={{ color: app.text_color ?? '#ffffff' }}>
              {platform}
            </p>
            <ChevronRight className="w-4 h-4 ml-auto opacity-50" style={{ color: app.text_color ?? '#ffffff' }} />
          </div>
        )}
        <p data-ev-id="ev_7f426755bd" className="text-xs text-center opacity-40 mt-2" style={{ color: app.text_color ?? '#ffffff' }}>
          Configure social links in feature settings
        </p>
      </div>);

  }

  // Default preview for other features
  return <GenericFeaturePreview app={app} feature={feature} />;
}

function EmptyState({ app, message }: {app: App;message: string;}) {
  return (
    <div data-ev-id="ev_faa1bd854c" className="text-center py-8">
      <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: app.text_color ?? '#ffffff' }} />
      <p data-ev-id="ev_70ee0b8255" className="opacity-60 text-sm" style={{ color: app.text_color ?? '#ffffff' }}>
        {message}
      </p>
    </div>);

}

function GenericFeaturePreview({ app, feature }: {app: App;feature: AppFeature;}) {
  const iconMap: Record<string, React.ComponentType<{className?: string;}>> = {
    Globe,
    CloudSun,
    Facebook,
    User,
    Rss,
    Music,
    Image,
    MessageSquare,
    Gamepad2,
    Shield,
    FileText,
    Link: LinkIcon,
    Code,
    Building2,
    Calendar,
    MessageCircle,
    Users,
    Video,
    Newspaper,
    Award,
    Grid3x3,
    Share2,
    Monitor,
    Layers
  };

  const IconComponent = iconMap[feature.icon ?? 'Globe'] ?? Globe;

  return (
    <div data-ev-id="ev_ede10a7684" className="text-center py-8">
      <div data-ev-id="ev_0e63adeaa6"
      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
      style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30' }}>

        <IconComponent className="w-8 h-8" style={{ color: app.theme_color ?? '#B8956B' }} />
      </div>
      <p data-ev-id="ev_8d90b60d7e" className="font-medium mb-2" style={{ color: app.text_color ?? '#ffffff' }}>
        {feature.name}
      </p>
      <p data-ev-id="ev_a2c4623d18" className="text-sm opacity-60" style={{ color: app.text_color ?? '#ffffff' }}>
        Configure this feature in the settings to add content.
      </p>
    </div>);

}
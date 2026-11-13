import { useState, useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { X } from 'lucide-react';
import { WebsitesSettings } from './WebsitesSettings';
import { LinksSettings } from './LinksSettings';
import { RSSFeedSettings } from './RSSFeedSettings';
import { WeatherSettings } from './WeatherSettings';
import { AIChatSettings } from './AIChatSettings';
import { CustomPageSettings } from './CustomPageSettings';
import { IframeSettings } from './IframeSettings';
import { SocialMediaSettings } from './SocialMediaSettings';
import { PrivacyPolicySettings } from './PrivacyPolicySettings';
import { GamesSettings } from './GamesSettings';
import { AudioSettings } from './AudioSettings';
import { LinkUrlSettings } from './LinkUrlSettings';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

interface FeatureSettingsModalProps {
  app: App;
  feature: AppFeature;
  onClose: () => void;
  onUpdate: (settings: Record<string, unknown>) => void;
}

export function FeatureSettingsModal({ app, feature, onClose, onUpdate }: FeatureSettingsModalProps) {
  const [settings, setSettings] = useState<Record<string, unknown>>(
    feature.settings as Record<string, unknown> ?? {}
  );

  const handleSave = () => {
    onUpdate(settings);
    onClose();
  };

  const updateSettings = (newSettings: Partial<Record<string, unknown>>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const renderSettingsContent = () => {
    const commonProps = {
      app,
      feature,
      settings,
      onUpdateSettings: updateSettings
    };

    switch (feature.feature_type) {
      case 'websites':
        return <WebsitesSettings {...commonProps} />;
      case 'links':
        return <LinksSettings {...commonProps} />;
      case 'rss-feed':
        return <RSSFeedSettings {...commonProps} />;
      case 'weather':
        return <WeatherSettings {...commonProps} />;
      case 'ai-chat':
        return <AIChatSettings {...commonProps} />;
      case 'custom-page':
        return <CustomPageSettings {...commonProps} />;
      case 'iframe':
      case 'website-to-app':
        return <IframeSettings {...commonProps} />;
      case 'social-media':
        return <SocialMediaSettings {...commonProps} />;
      case 'privacy-policy':
        return <PrivacyPolicySettings {...commonProps} />;
      case 'games':
        return <GamesSettings {...commonProps} />;
      case 'audio':
        return <AudioSettings {...commonProps} />;
      case 'ai-concierge':
      case 'business-directory':
      case 'events-calendar':
      case 'member-portal':
        return <LinkUrlSettings {...commonProps} />;
      default:
        return (
          <div data-ev-id="ev_9e9bdc1cea" className="p-8 text-center">
            <p data-ev-id="ev_b0e8c17808" className="text-muted">Settings for this feature type are coming soon.</p>
          </div>);

    }
  };

  return (
    <div data-ev-id="ev_0b4900da8b" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_f2425c2bf0" className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_1dacfd9226" className="flex items-center justify-between p-6 border-b border-border">
          <div data-ev-id="ev_5e7fd2c6ac" className="flex items-center gap-3">
            <div data-ev-id="ev_bd0a5586d0"
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

              <span data-ev-id="ev_d61b77c4b7" style={{ color: app.theme_color ?? '#B8956B' }} className="text-lg font-bold">
                {feature.name.charAt(0)}
              </span>
            </div>
            <div data-ev-id="ev_ce12224a5e">
              <h2 data-ev-id="ev_e74210caab" className="text-xl font-semibold text-text">{feature.name}</h2>
              <p data-ev-id="ev_06c5504cd3" className="text-sm text-muted">{feature.feature_type}</p>
            </div>
          </div>
          <button data-ev-id="ev_4b25897a2e" onClick={onClose} className="text-muted hover:text-text transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_409e3ce456" className="flex-1 overflow-y-auto">
          {renderSettingsContent()}
        </div>

        {/* Footer */}
        <div data-ev-id="ev_6c4bfebe1a" className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button data-ev-id="ev_ab5b6616b1"
          onClick={onClose}
          className="px-6 py-2.5 text-muted hover:text-text font-medium transition-colors">

            Cancel
          </button>
          <button data-ev-id="ev_72c1beb204"
          onClick={handleSave}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors">

            Save Changes
          </button>
        </div>
      </div>
    </div>);

}
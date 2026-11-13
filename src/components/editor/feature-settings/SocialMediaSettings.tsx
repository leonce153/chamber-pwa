import type { FeatureSettingsProps, SocialMediaSettingsData } from './types';
import { LayoutGrid, List, Square, Facebook, Twitter, Instagram, Linkedin, Youtube, Github, Globe } from 'lucide-react';

export function SocialMediaSettings({ settings, onUpdateSettings }: FeatureSettingsProps) {
  const socialSettings: SocialMediaSettingsData = {
    displayStyle: settings.displayStyle as SocialMediaSettingsData['displayStyle'] ?? 'icons',
    platforms: settings.platforms as SocialMediaSettingsData['platforms'] ?? {}
  };

  const updatePlatform = (platform: string, value: string) => {
    onUpdateSettings({
      platforms: {
        ...socialSettings.platforms,
        [platform]: value || undefined
      }
    });
  };

  const displayStyles = [
  { id: 'icons' as const, name: 'Icons Only', description: 'Compact circular icons', icon: LayoutGrid },
  { id: 'buttons' as const, name: 'Buttons', description: 'Full-width branded buttons', icon: Square },
  { id: 'list' as const, name: 'List', description: 'List with labels', icon: List }];


  const platforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/yourpage', color: '#1877F2' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, placeholder: 'https://x.com/yourhandle', color: '#000000' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/yourprofile', color: '#E4405F' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/yourprofile', color: '#0A66C2' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@yourchannel', color: '#FF0000' },
  { id: 'tiktok', name: 'TikTok', icon: Globe, placeholder: 'https://tiktok.com/@yourprofile', color: '#000000' },
  { id: 'github', name: 'GitHub', icon: Github, placeholder: 'https://github.com/yourusername', color: '#181717' },
  { id: 'website', name: 'Website', icon: Globe, placeholder: 'https://yourwebsite.com', color: '#B8956B' }];


  return (
    <div data-ev-id="ev_9119c4f6f9" className="p-6 flex flex-col gap-8">
      {/* Display Style */}
      <section data-ev-id="ev_14f5d4bda4">
        <h3 data-ev-id="ev_b440062c6d" className="text-lg font-semibold text-text mb-2">Display Style</h3>
        <p data-ev-id="ev_bd60a85fe0" className="text-sm text-muted mb-4">Choose how social links are displayed.</p>
        
        <div data-ev-id="ev_e44330622e" className="grid grid-cols-3 gap-4">
          {displayStyles.map((style) =>
          <button data-ev-id="ev_cbb43597a4"
          key={style.id}
          onClick={() => onUpdateSettings({ displayStyle: style.id })}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
          socialSettings.displayStyle === style.id ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

              <style.icon className={`w-6 h-6 mb-2 ${
            socialSettings.displayStyle === style.id ? 'text-primary' : 'text-muted'}`
            } />
              <p data-ev-id="ev_f3d53a0a6d" className="font-medium text-text">{style.name}</p>
              <p data-ev-id="ev_fa0a6d7733" className="text-xs text-muted mt-1">{style.description}</p>
            </button>
          )}
        </div>
      </section>

      {/* Social Links */}
      <section data-ev-id="ev_7cf13aaf8f">
        <h3 data-ev-id="ev_05c261f80d" className="text-lg font-semibold text-text mb-2">Social Links</h3>
        <p data-ev-id="ev_b81ba5ba02" className="text-sm text-muted mb-4">Add links to your social media profiles. Leave empty to hide.</p>
        
        <div data-ev-id="ev_e2f259173e" className="flex flex-col gap-4">
          {platforms.map((platform) =>
          <div data-ev-id="ev_7be211528a" key={platform.id} className="flex items-center gap-3">
              <div data-ev-id="ev_8ccbb016dc"
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: platform.color + '20' }}>

                <platform.icon className="w-5 h-5" style={{ color: platform.color }} />
              </div>
              <div data-ev-id="ev_cd694cad84" className="flex-1">
                <label data-ev-id="ev_8505caa39f" className="block text-sm font-medium text-text mb-1">{platform.name}</label>
                <input data-ev-id="ev_9f3f678e7e"
              type="url"
              value={(socialSettings.platforms as Record<string, string | undefined>)[platform.id] ?? ''}
              onChange={(e) => updatePlatform(platform.id, e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-2 text-text placeholder:text-muted text-sm"
              placeholder={platform.placeholder} />

              </div>
            </div>
          )}
        </div>
      </section>

      {/* Preview */}
      <section data-ev-id="ev_8b206f47ec">
        <h3 data-ev-id="ev_04b848450e" className="text-lg font-semibold text-text mb-4">Preview</h3>
        
        <div data-ev-id="ev_7798fa06ef" className="bg-surface-elevated border border-border rounded-xl p-6">
          {socialSettings.displayStyle === 'icons' &&
          <div data-ev-id="ev_2150d1bda2" className="flex items-center justify-center gap-4 flex-wrap">
              {platforms.
            filter((p) => (socialSettings.platforms as Record<string, string | undefined>)[p.id]).
            map((platform) =>
            <a data-ev-id="ev_c365ce0b7e"
            key={platform.id}
            href={(socialSettings.platforms as Record<string, string | undefined>)[platform.id]}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: platform.color }}>

                    <platform.icon className="w-6 h-6 text-white" />
                  </a>
            )}
              {!platforms.some((p) => (socialSettings.platforms as Record<string, string | undefined>)[p.id]) &&
            <p data-ev-id="ev_d13e93346a" className="text-muted text-sm">Add social links above to see preview</p>
            }
            </div>
          }

          {socialSettings.displayStyle === 'buttons' &&
          <div data-ev-id="ev_1c0d33810c" className="flex flex-col gap-3 max-w-sm mx-auto">
              {platforms.
            filter((p) => (socialSettings.platforms as Record<string, string | undefined>)[p.id]).
            map((platform) =>
            <a data-ev-id="ev_9dc5dfe87c"
            key={platform.id}
            href={(socialSettings.platforms as Record<string, string | undefined>)[platform.id]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: platform.color }}>

                    <platform.icon className="w-5 h-5" />
                    <span data-ev-id="ev_81e0581077">Follow on {platform.name}</span>
                  </a>
            )}
              {!platforms.some((p) => (socialSettings.platforms as Record<string, string | undefined>)[p.id]) &&
            <p data-ev-id="ev_c68bc23a71" className="text-muted text-sm text-center">Add social links above to see preview</p>
            }
            </div>
          }

          {socialSettings.displayStyle === 'list' &&
          <div data-ev-id="ev_3da299ea0a" className="flex flex-col gap-2 max-w-sm mx-auto">
              {platforms.
            filter((p) => (socialSettings.platforms as Record<string, string | undefined>)[p.id]).
            map((platform) =>
            <a data-ev-id="ev_d0e3ff3b81"
            key={platform.id}
            href={(socialSettings.platforms as Record<string, string | undefined>)[platform.id]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-background hover:bg-surface transition-colors">

                    <platform.icon className="w-5 h-5" style={{ color: platform.color }} />
                    <span data-ev-id="ev_98439c292f" className="text-text">{platform.name}</span>
                  </a>
            )}
              {!platforms.some((p) => (socialSettings.platforms as Record<string, string | undefined>)[p.id]) &&
            <p data-ev-id="ev_42470cb408" className="text-muted text-sm text-center">Add social links above to see preview</p>
            }
            </div>
          }
        </div>
      </section>
    </div>);

}
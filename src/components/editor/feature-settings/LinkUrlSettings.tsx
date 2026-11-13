import type { Tables } from '@/integrations/supabase/helpers';
import { Link } from 'lucide-react';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

interface LinkUrlSettingsProps {
  app: App;
  feature: AppFeature;
  settings: Record<string, unknown>;
  onUpdateSettings: (settings: Partial<Record<string, unknown>>) => void;
}

export function LinkUrlSettings({ feature, settings, onUpdateSettings }: LinkUrlSettingsProps) {
  const url = settings.url as string || '';

  return (
    <div data-ev-id="ev_434302735c" className="p-6">
      <div data-ev-id="ev_59083caaa9" className="flex items-start gap-4 mb-6">
        <div data-ev-id="ev_5d91826e9e" className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Link className="w-5 h-5 text-primary" />
        </div>
        <div data-ev-id="ev_153ddd57f7">
          <h3 data-ev-id="ev_08cc997185" className="font-semibold text-text">Link URL</h3>
          <p data-ev-id="ev_f26ed81fdc" className="text-sm text-muted mt-1">
            Set the URL path that opens when users tap this tab. Leave empty to use the default.
          </p>
        </div>
      </div>

      <div data-ev-id="ev_6bb822434b" className="space-y-4">
        <div data-ev-id="ev_0f69f7d644">
          <label data-ev-id="ev_799b81ace4" className="block text-sm font-medium text-text mb-2">
            URL Path
          </label>
          <input data-ev-id="ev_bb24218ff5"
          type="text"
          value={url}
          onChange={(e) => onUpdateSettings({ url: e.target.value })}
          placeholder={`e.g., /${feature.feature_type === 'ai-concierge' ? 'ask-the-mule' : feature.feature_type === 'business-directory' ? 'directory' : feature.feature_type === 'events-calendar' ? 'events' : 'member-login'}`}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" />

          <p data-ev-id="ev_c8fc6b7db3" className="text-xs text-muted mt-2">
            This path will be appended to your portal base URL.
          </p>
        </div>
      </div>
    </div>);

}
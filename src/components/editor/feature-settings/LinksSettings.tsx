import { WebsitesSettings } from './WebsitesSettings';
import type { FeatureSettingsProps } from './types';

// Links uses the same settings as Websites - they share the same underlying component
export function LinksSettings(props: FeatureSettingsProps) {
  return <WebsitesSettings {...props} />;
}

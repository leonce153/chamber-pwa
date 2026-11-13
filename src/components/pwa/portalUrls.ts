type AppFeatureLike = { settings: unknown } | null;

export type PortalTabType = 'directory' | 'events' | 'chat' | 'member';

/** Default portal path for each tab. */
export const PORTAL_DEFAULT_PATHS: Record<PortalTabType, string> = {
  directory: '/directory',
  events: '/events',
  chat: '/embed/ai-concierge',
  member: '/login?returnTo=/member-portal'
};

/** Portal URL for a tab; the feature settings URL (Build > feature settings) overrides the default. */
export function getPortalTabUrl(
  tabType: PortalTabType,
  feature: AppFeatureLike,
  basePortalUrl: string,
  pathOverride?: string
): string {
  const base = basePortalUrl.replace(/\/$/, '');
  if (!pathOverride && feature?.settings) {
    const settings = feature.settings as Record<string, unknown>;
    const custom = (settings.url || settings.iframe_url) as string | undefined;
    if (custom) return custom.startsWith('/') ? `${base}${custom}` : custom;
  }
  return `${base}${pathOverride ?? PORTAL_DEFAULT_PATHS[tabType]}`;
}

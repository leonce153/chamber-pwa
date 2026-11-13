import { useSubdomain } from '@/hooks/useSubdomain';
import AppPreview from '@/pages/AppPreview';
import { Loader2 } from 'lucide-react';

/**
 * Router component for subdomain-based PWA access.
 * Renders the app's PWA when accessed via subdomain.
 * Falls back to 404 if app not found.
 */
export function SubdomainRouter() {
  const { app, loading, error, subdomain } = useSubdomain();

  if (loading) {
    return (
      <div data-ev-id="ev_535c2da1ca" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  if (error || !app) {
    return (
      <div data-ev-id="ev_75aedb343d" className="min-h-screen bg-background flex items-center justify-center">
        <div data-ev-id="ev_3bce9062be" className="text-center p-8">
          <h1 data-ev-id="ev_11af9c62cb" className="text-4xl font-bold text-text mb-4">App Not Found</h1>
          <p data-ev-id="ev_8ee3f89f4e" className="text-muted mb-6">
            {error === 'App not found' ?
            `No app is configured for "${subdomain}"` :
            'This app is currently unavailable'
            }
          </p>
          <a data-ev-id="ev_65896e7e98"
          href="/"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors">

            Go to Homepage
          </a>
        </div>
      </div>);

  }

  // Render the app's PWA interface
  return <AppPreview appFromSubdomain={app} />;
}
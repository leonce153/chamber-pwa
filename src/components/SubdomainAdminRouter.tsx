import { useEffect } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { Loader2 } from 'lucide-react';

/**
 * Admin router for subdomain-based access.
 * Redirects to the main platform's app editor for the current subdomain's app.
 */
export function SubdomainAdminRouter() {
  const { app, loading, error, subdomain } = useSubdomain();

  useEffect(() => {
    if (!loading && app) {
      // Redirect to main domain's app editor
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const parts = hostname.split('.');

      // Get main domain by removing subdomain
      const mainDomain = parts.slice(1).join('.');
      const mainUrl = `${protocol}//${mainDomain}/app/${app.id}/edit`;

      window.location.href = mainUrl;
    }
  }, [loading, app]);

  if (loading) {
    return (
      <div data-ev-id="ev_3eeb7b804e" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  if (error || !app) {
    return (
      <div data-ev-id="ev_033580386f" className="min-h-screen bg-background flex items-center justify-center">
        <div data-ev-id="ev_9e95359a6e" className="text-center p-8">
          <h1 data-ev-id="ev_59619030d4" className="text-4xl font-bold text-text mb-4">Access Denied</h1>
          <p data-ev-id="ev_f0ede31eab" className="text-muted mb-6">
            {error === 'App not found' ?
            `No app configured for "${subdomain}"` :
            'You do not have permission to access this admin panel.'
            }
          </p>
          <a data-ev-id="ev_4601d8c46b"
          href="/"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors">

            Go Back
          </a>
        </div>
      </div>);

  }

  // Show loading while redirecting
  return (
    <div data-ev-id="ev_dfb38f29c1" className="min-h-screen bg-background flex items-center justify-center">
      <div data-ev-id="ev_ef8285d7d0" className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p data-ev-id="ev_27d96ce166" className="text-muted">Redirecting to admin panel...</p>
      </div>
    </div>);

}
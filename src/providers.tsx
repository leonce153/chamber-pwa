import { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

/**
 * ⚠️ App-wide providers. Add new providers here — they'll be available in all routes.
 *
 * - DO NOT add <BrowserRouter> here (it's in main.tsx)
 * - Providers should wrap children, not contain routes
 * - To add a provider: wrap children with <YourProvider>{children}</YourProvider>
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </AuthProvider>
  );
}

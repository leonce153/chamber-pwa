import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ROLE_LABELS, type UserRole } from '@/types/auth';
import {
  Home,
  Bell,
  Users,
  UserCog,
  Hammer,
  LayoutGrid,
  Share2,
  Settings,
  LogOut,
  Loader2,
  ExternalLink,
  Menu,
  X } from
'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Single-tenant app layout with unified sidebar.
 * Shows app logo/name from settings and simplified navigation.
 * All routes are under /admin/*
 */
export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, role } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();
  // On phones the menu slides in over the page instead of taking half the screen.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/signin');
  };

  // Main navigation items, filtered by role (the server enforces the same rules)
  const allNavItems: { href: string; icon: typeof Home; label: string; roles: UserRole[] }[] = [
  { href: '/admin/home', icon: Home, label: 'Home', roles: ['owner', 'editor'] },
  { href: '/admin/notify', icon: Bell, label: 'Notify', roles: ['owner', 'editor', 'sender'] },
  { href: '/admin/audience', icon: Users, label: 'Audience', roles: ['owner', 'editor'] },
  { href: '/admin/build', icon: Hammer, label: 'Build', roles: ['owner', 'editor'] },
  { href: '/admin/home-screen', icon: LayoutGrid, label: 'Home screen', roles: ['owner', 'editor'] },
  { href: '/admin/distribute', icon: Share2, label: 'Distribute', roles: ['owner'] },
  { href: '/admin/team', icon: UserCog, label: 'Team', roles: ['owner'] },
  { href: '/admin/settings', icon: Settings, label: 'Settings', roles: ['owner', 'editor'] }];
  const navItems = allNavItems.filter((item) => item.roles.includes(role));


  const isActiveRoute = (href: string) => {
    if (href === '/admin/home') return location.pathname === '/admin/home' || location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  if (settingsLoading) {
    return (
      <div data-ev-id="layout_loading" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  return (
    <div data-ev-id="app_layout" className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Phone top bar */}
      <header data-ev-id="mobile_bar" className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-surface border-b border-border">
        <button
          data-ev-id="menu_btn"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-[10px] text-text hover:bg-surface-elevated"
          aria-label="Open menu">
          <Menu className="w-6 h-6" />
        </button>
        <span data-ev-id="mobile_app_name" className="font-display font-bold text-text truncate">
          {settings?.app_name ?? 'My App'}
        </span>
      </header>

      {menuOpen &&
      <div data-ev-id="menu_backdrop" className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)} />
      }

      {/* Sidebar */}
      <aside
        data-ev-id="sidebar"
        className={`w-[248px] max-w-[85vw] bg-surface border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 overflow-y-auto transition-transform md:static md:translate-x-0 md:z-auto md:max-w-none md:shrink-0 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full'}`
        }>
        <button
          data-ev-id="menu_close"
          onClick={() => setMenuOpen(false)}
          className="md:hidden absolute top-4 right-3 p-2 rounded-[10px] text-text-tertiary hover:bg-surface-elevated"
          aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
        {/* App Logo & Name */}
        <div data-ev-id="sidebar_header" className="p-5 border-b border-border">
          <Link data-ev-id="logo_link" to={role === 'sender' ? '/admin/notify' : '/admin/home'} className="flex items-center gap-2.5">
            {settings?.icon_url ?
            <img data-ev-id="ev_97e82be225"
            src={settings.icon_url}
            alt={settings.app_name}
            className="w-9 h-9 rounded-[10px] object-cover" /> :


            <div
              data-ev-id="logo_placeholder"
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-display font-bold"
              style={{ backgroundColor: settings?.primary_color ?? '#B8956B' }}>

                {(settings?.app_name ?? 'A').charAt(0).toUpperCase()}
              </div>
            }
            <span data-ev-id="app_name" className="text-lg font-display font-bold text-text truncate">
              {settings?.app_name ?? 'My App'}
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav data-ev-id="nav" className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                data-ev-id={`nav_${item.label.toLowerCase().replace(/\s+/g, '_')}`}
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] ${
                isActive ?
                'bg-primary text-white' :
                'text-text-secondary hover:text-text hover:bg-surface-elevated'}`
                }>

                <item.icon className="w-5 h-5" />
                <span data-ev-id="nav_label" className="font-medium">{item.label}</span>
              </Link>);

          })}

          {/* View Live App Link */}
          <a data-ev-id="ev_18352032ae"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] text-text-secondary hover:text-text hover:bg-surface-elevated mt-4">

            <ExternalLink className="w-5 h-5" />
            <span data-ev-id="ev_c3598ebb23" className="font-medium">View live app</span>
          </a>
        </nav>

        {/* User section */}
        <div data-ev-id="user_section" className="p-4 border-t border-border">
          <div data-ev-id="user_info" className="flex items-center gap-3">
            <div
              data-ev-id="user_avatar"
              className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center text-[#C9CBFF] font-display font-semibold">

              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div data-ev-id="user_details" className="flex-1 min-w-0">
              <p data-ev-id="user_name" className="text-sm font-medium text-text truncate">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p data-ev-id="user_role" className="text-xs text-text-tertiary truncate">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <button
              data-ev-id="signout_btn"
              onClick={handleSignOut}
              className="p-2.5 text-text-tertiary hover:text-destructive hover:bg-[#DC262620] rounded-[10px] transition-colors"
              title="Sign out">

              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main data-ev-id="main_content" className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>);

}
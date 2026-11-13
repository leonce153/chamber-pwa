import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap,
  LayoutDashboard,
  LogOut,
  ArrowLeft,
  Crown } from
'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  appName?: string;
  showBackToDashboard?: boolean;
}

export function DashboardLayout({ children, appName, showBackToDashboard }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isSuperAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const mainNavItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(isSuperAdmin ? [{ href: '/admin', icon: Crown, label: 'Admin Panel' }] : [])
  ];


  return (
    <div data-ev-id="ev_978ca3c843" className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside data-ev-id="ev_5cdc82a8c8" className="w-64 bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div data-ev-id="ev_32d9575313" className="p-5 border-b border-border">
          <Link data-ev-id="ev_ce9d92ef49" to="/dashboard" className="flex items-center gap-2.5">
            <div data-ev-id="ev_71315d4af1" className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span data-ev-id="ev_a4aff5d312" className="text-lg font-display font-bold text-text">AppForge</span>
          </Link>
        </div>

        {/* Back to dashboard / App name */}
        {showBackToDashboard && appName &&
        <div data-ev-id="ev_b8c88f706e" className="p-4 border-b border-border">
            <Link data-ev-id="ev_d8f8af5ca7"
          to="/dashboard"
          className="flex items-center gap-2 text-muted hover:text-text transition-colors text-sm mb-2">

              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <p data-ev-id="ev_655f652cd8" className="text-text font-medium truncate">{appName}</p>
          </div>
        }

        {/* Navigation */}
        <nav data-ev-id="ev_02edb326b8" className="flex-1 p-4 flex flex-col gap-1">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link data-ev-id="ev_d7a4684787"
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors min-h-[44px] ${
              isActive ?
              'bg-primary text-white' :
              'text-text-secondary hover:text-text hover:bg-surface-elevated'}`
              }>

                <item.icon className="w-5 h-5" />
                <span data-ev-id="ev_78226822bc" className="font-medium">{item.label}</span>
              </Link>);

          })}


        </nav>

        {/* User section */}
        <div data-ev-id="ev_8bbbb2aa40" className="p-4 border-t border-border">
          <div data-ev-id="ev_5d5081093d" className="flex items-center gap-3">
            <div data-ev-id="ev_8b893216f0" className="w-10 h-10 rounded-[10px] bg-[#262A45] flex items-center justify-center text-[#C9CBFF] font-display font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div data-ev-id="ev_20ab6352d8" className="flex-1 min-w-0">
              <p data-ev-id="ev_5426707d91" className="text-sm font-medium text-text truncate">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p data-ev-id="ev_d9c375ce27" className="text-xs text-text-tertiary truncate">{user?.email}</p>
            </div>
            <button data-ev-id="ev_ca43930902"
            onClick={handleSignOut}
            className="p-2.5 text-text-tertiary hover:text-destructive hover:bg-[#DC262620] rounded-[10px] transition-colors"
            title="Sign out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main data-ev-id="ev_863e89efb9" className="flex-1 overflow-auto">
        {children}
      </main>
    </div>);

}
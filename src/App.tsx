/**
 * ⚠️ ROUTING RULES:
 * - DO NOT add <BrowserRouter> here — it's already in main.tsx
 * - DO NOT use useRoutes() — only <Routes>/<Route>
 * - Keep this file focused on route definitions
 * 
 * URL STRUCTURE (Single-Tenant):
 * - / → Public PWA for end users
 * - /admin/* → Management area (protected)
 */

import { Routes, Route, Navigate } from 'react-router';
import Index from '@/pages/Index';
import AdminSignIn from '@/pages/AdminSignIn';
import AdminResetPassword from '@/pages/AdminResetPassword';
import AuthCallback from '@/pages/AuthCallback';
import Home from '@/pages/Home';
import Notify from '@/pages/Notify';
import Audience from '@/pages/Audience';
import Build from '@/pages/Build';
import Distribute from '@/pages/Distribute';
import Settings from '@/pages/Settings';
import Team from '@/pages/Team';
import HomeScreen from '@/pages/HomeScreen';
import AdminAcceptInvite from '@/pages/AdminAcceptInvite';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { homeForRole } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Redirect component for /admin root.
 * Sends authenticated users to /admin/home, others to /admin/signin.
 */
function AdminRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div data-ev-id="ev_2161d1c1d9" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);

  }

  return <Navigate to={user ? homeForRole(role) : '/admin/signin'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public PWA - root serves the installable app for end users */}
      <Route path="/" element={<Index />} />

      {/* Admin area */}
      <Route path="/admin" element={<AdminRedirect />} />
      <Route path="/admin/signin" element={<AdminSignIn />} />
      <Route path="/admin/reset-password" element={<AdminResetPassword />} />
      <Route path="/admin/accept-invite" element={<AdminAcceptInvite />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected admin routes */}
      <Route
        path="/admin/home"
        element={
        <AdminProtectedRoute>
            <Home />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/notify"
        element={
        <AdminProtectedRoute>
            <Notify />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/audience"
        element={
        <AdminProtectedRoute allow={['owner', 'editor']}>
            <Audience />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/build"
        element={
        <AdminProtectedRoute allow={['owner', 'editor']}>
            <Build />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/home-screen"
        element={
        <AdminProtectedRoute allow={['owner', 'editor']}>
            <HomeScreen />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/distribute"
        element={
        <AdminProtectedRoute allow={['owner']}>
            <Distribute />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/settings"
        element={
        <AdminProtectedRoute allow={['owner', 'editor']}>
            <Settings />
          </AdminProtectedRoute>
        } />

      <Route
        path="/admin/team"
        element={
        <AdminProtectedRoute allow={['owner']}>
            <Team />
          </AdminProtectedRoute>
        } />


      {/* Catch-all: redirect to public PWA */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>);

}
import React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AuthPortal from '../features/auth/AuthPortal';
import { useAuth } from '../features/auth/useAuth';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function AppShell() {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const { data: me, refresh } = useAuth();
  const [offline, setOffline] = React.useState(!navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  React.useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 px-3 py-2 rounded-md bg-brand-600">Skip to content</a>
      {offline && (
        <div aria-live="polite" className="bg-amber-600/20 text-amber-300 text-sm py-2 text-center border-b border-amber-400/30">You are offline. Some actions may not work.</div>
      )}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-neutral-900/80 border-b border-white/10">
        <div className="container-fluid h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">events<span className="text-fuchsia-400">.ai</span></Link>
          <nav aria-label="Main navigation" className="flex items-center gap-2 text-sm">
            <NavLink to="/events" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white shadow-[0_0_12px_rgba(168,85,247,0.15)]' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
              <span className="inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Events</span>
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white shadow-[0_0_12px_rgba(168,85,247,0.15)]' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>
              <span className="inline-flex items-center gap-2"><Package className="w-4 h-4" /> My Orders</span>
            </NavLink>
            {me && (me.role === 'organizer' || me.role === 'admin') && (
              <NavLink to="/organizer/events" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/5'}`}>Organizer</NavLink>
            )}
            {me ? (
              <div className="flex items-center gap-2">
                <span className="text-neutral-300">{me.email}</span>
                <form
                  action="#"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await fetch((import.meta as any).env.VITE_API_URL + '/api/auth/logout', { method: 'POST', credentials: 'include' });
                      // Clear client cache to prevent stale queries from firing with 401s
                      try { queryClient.clear(); } catch {}
                      // Refresh auth state and navigate to a safe route
                      await refresh();
                      navigate('/events');
                      toast.success('Logged out');
                    } catch {
                      toast.error('Logout failed');
                    }
                  }}
                >
                  <button className="text-neutral-300 hover:text-white" type="submit">Logout</button>
                </form>
              </div>
            ) : (
              <>
                <button onClick={() => setLoginOpen(true)} className="text-neutral-300 hover:text-white">Log in</button>
                <button onClick={() => setSignupOpen(true)} className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500">Sign up</button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="container-fluid py-12">
        {prefersReducedMotion ? (
          <Outlet />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      <footer className="border-t border-white/10 py-8 text-xs text-neutral-400">
        <div className="container-fluid">© {new Date().getFullYear()} events.ai</div>
      </footer>
      <AuthPortal open={loginOpen} onClose={() => { setLoginOpen(false); refresh(); }} initialMode="login" />
      <AuthPortal open={signupOpen} onClose={() => { setSignupOpen(false); refresh(); }} initialMode="signup" />
    </div>
  );
}



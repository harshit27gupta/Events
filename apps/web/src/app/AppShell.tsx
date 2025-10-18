import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LoginModal } from '../features/auth/LoginModal';
import { SignupModal } from '../features/auth/SignupModal';
import { useAuth } from '../features/auth/useAuth';
import { toast } from 'sonner';

export function AppShell() {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const { data: me, refresh } = useAuth();
  const [offline, setOffline] = React.useState(!navigator.onLine);
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
      <header className="sticky top-0 z-50 backdrop-blur bg-neutral-900/60 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">events<span className="text-fuchsia-400">.ai</span></Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/events" className="hover:text-white text-neutral-300">Events</Link>
            <Link to="/orders" className="hover:text-white text-neutral-300">My Orders</Link>
            {me && (me.role === 'organizer' || me.role === 'admin') && (
              <Link to="/organizer/events" className="hover:text-white text-neutral-300">Organizer</Link>
            )}
            {me ? (
              <div className="flex items-center gap-2">
                <span className="text-neutral-300">{me.email}</span>
                <form action="#" onSubmit={async (e) => { e.preventDefault(); try { await fetch((import.meta as any).env.VITE_API_URL + '/api/auth/logout', { method: 'POST', credentials: 'include' }); toast.success('Logged out'); } catch { toast.error('Logout failed'); } finally { refresh(); } }}>
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
      <main id="main" className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 py-8 text-xs text-neutral-400">
        <div className="max-w-6xl mx-auto px-4">© {new Date().getFullYear()} events.ai</div>
      </footer>
      <LoginModal open={loginOpen} onClose={() => { setLoginOpen(false); refresh(); }} />
      <SignupModal open={signupOpen} onClose={() => { setSignupOpen(false); refresh(); }} />
    </div>
  );
}



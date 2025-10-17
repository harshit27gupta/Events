import axios from 'axios';
import { toast } from 'sonner';

export const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || 'http://localhost:8080',
  withCredentials: true
});

api.interceptors.response.use(
  (r) => {
    const url = r?.config?.url || '';
    if (url.includes('/api/auth/login') || url.includes('/api/auth/refresh')) {
      // reset guard after successful auth
      (window as any).__sessionToastShown = false;
    }
    return r;
  },
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // show once per page session
      const shown = (window as any).__sessionToastShown;
      if (!shown) {
        (window as any).__sessionToastShown = true;
        toast.error('Session expired. Please log in again.');
        try {
          const key = '__last401RefreshAt';
          const now = Date.now();
          const last = Number(sessionStorage.getItem(key) || '0');
          if (!last || now - last > 60000) {
            sessionStorage.setItem(key, String(now));
            // Give the toast a moment, then reload to sync app state
            setTimeout(() => {
              try { (window as any).__sessionToastShown = false; } catch {}
              location.reload();
            }, 1200);
          }
        } catch {}
      }
    }
    return Promise.reject(err);
  }
);



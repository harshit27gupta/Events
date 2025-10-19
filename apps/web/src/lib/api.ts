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
      (window as any).__sessionToastShown = false;
    }
    return r;
  },
  (err) => {
    const requestId = err?.response?.headers['x-request-id'] || 'unknown';
    const status = err?.response?.status;
    const errorMsg = err?.response?.data?.error;
    if (status) {
      if (status === 401) {
        const shown = (window as any).__sessionToastShown;
        if (!shown) {
          (window as any).__sessionToastShown = true;
          toast.error(`Session expired. Please log in again. [Request ID: ${requestId}]`);
          try {
            const key = '__last401RefreshAt';
            const now = Date.now();
            const last = Number(sessionStorage.getItem(key) || '0');
            if (!last || now - last > 60000) {
              sessionStorage.setItem(key, String(now));
              setTimeout(() => {
                try { (window as any).__sessionToastShown = false; } catch {}
                location.reload();
              }, 1200);
            }
          } catch {}
        }
      } else if (status === 403) {
        toast.error(`Access denied. Please check your permissions. [Request ID: ${requestId}]`);
      } else if (status === 404) {
        toast.error(`Resource not found. Please try again later. [Request ID: ${requestId}]`);
      } else if (status === 429) {
        toast.error(`Too many requests. Please slow down. [Request ID: ${requestId}]`);
      } else if (status >= 500) {
        toast.error(`Server error. Try again later. [Request ID: ${requestId}]`);
      }
    }
    console.error(`Request failed [${requestId}]:`, errorMsg);
    return Promise.reject(err);
  }
);



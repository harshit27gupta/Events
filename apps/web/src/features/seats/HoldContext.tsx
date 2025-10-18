import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useActiveHold } from './useActiveHold';
import { api } from '../../lib/api';

type HoldContextValue = {
  eventId: string | null;
  holdId: string | null;
  ttl: number;
  isActive: boolean;
  eventName: string | null;
  cancelHold: () => Promise<void>;
};

const HoldContext = React.createContext<HoldContextValue | undefined>(undefined);

export function HoldProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId, holdId, ttl, isActive, eventName } = useActiveHold();
  const prevTtlRef = React.useRef<number>(ttl);
  const [expNotifiedFor, setExpNotifiedFor] = React.useState<string>('');

  React.useEffect(() => {
    // Detect expiry while on checkout and redirect once per holdId
    const onCheckout = location.pathname.startsWith('/checkout');
    if (onCheckout && holdId && prevTtlRef.current > 0 && ttl === 0 && expNotifiedFor !== holdId) {
      setExpNotifiedFor(holdId);
      toast.error('Your seat hold expired during payment. Redirecting to events.');
      navigate('/events', { replace: true });
    }
    prevTtlRef.current = ttl;
  }, [ttl, holdId, location.pathname, navigate, expNotifiedFor]);

  const value = React.useMemo<HoldContextValue>(
    () => ({
      eventId,
      holdId,
      ttl,
      isActive,
      eventName,
      cancelHold: async () => {
        if (eventId && holdId) {
          try { await api.delete(`/api/orders/holds/${holdId}`); } catch {}
          try { localStorage.removeItem(`hold:${eventId}`); } catch {}
        }
      }
    }),
    [eventId, holdId, ttl, isActive, eventName]
  );

  return <HoldContext.Provider value={value}>{children}</HoldContext.Provider>;
}

export function useHold() {
  const ctx = React.useContext(HoldContext);
  if (!ctx) throw new Error('useHold must be used within HoldProvider');
  return ctx;
}



import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function getStoredHold(): { eventId: string; holdId: string } | null {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || '';
    if (k.startsWith('hold:')) {
      const eventId = k.slice('hold:'.length);
      const holdId = localStorage.getItem(k) || '';
      if (eventId && holdId) return { eventId, holdId };
    }
  }
  return null;
}

export function useActiveHold() {
  const stored = typeof window !== 'undefined' ? getStoredHold() : null;
  const ttlQuery = useQuery({
    queryKey: ['hold-ttl', stored?.holdId],
    queryFn: async () => {
      if (!stored) return { ttl: 0 };
      const r = await api.get(`/api/orders/holds/${stored.holdId}/ttl`);
      return { ttl: r.data.ttl as number };
    },
    enabled: !!stored?.holdId,
    refetchInterval: 5000
  });
  // Client-side ticking every second using last synced TTL to avoid blinking
  const [localTtl, setLocalTtl] = (typeof window !== 'undefined') ? (window as any).__holdLocalTtlState || (() => {
    const s = { val: 0 };
    (window as any).__holdLocalTtlState = [s, (v: number) => { s.val = v; }];
    return (window as any).__holdLocalTtlState;
  })() : [ { val: 0 }, (_: number) => {} ];
  const serverTtl = ttlQuery.data?.ttl ?? 0;
  if (serverTtl && serverTtl !== localTtl.val) {
    setLocalTtl(serverTtl);
  }
  React.useEffect(() => {
    const iv = setInterval(() => {
      setLocalTtl(Math.max(0, (localTtl.val ?? 0) - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  const ttl = localTtl.val ?? serverTtl;
  const isActive = !!stored && ttl > 0;
  return { eventId: stored?.eventId || null, holdId: stored?.holdId || null, ttl, isActive } as const;
}



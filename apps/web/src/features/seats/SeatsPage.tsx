import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { getStoredHold } from './useActiveHold';
import { motion } from 'framer-motion';
import Seat from '../../components/Seat';

type Seat = { seatId: string; row: number; number: number; state: 'available' | 'held' | 'reserved' };
type SeatsResponse = { eventId: string; seats: Seat[] };

const stateColors: Record<Seat['state'], string> = {
  available: 'bg-emerald-500 hover:bg-emerald-400',
  held: 'bg-amber-500',
  reserved: 'bg-rose-600'
};

export function SeatsPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [holdId, setHoldId] = React.useState<string | null>(null);
  const [ttl, setTtl] = React.useState<number | null>(null);
  const [ttlSynced, setTtlSynced] = React.useState(false);
  const seatsQuery = useQuery<SeatsResponse>({
    queryKey: ['seats', eventId],
    queryFn: async () => (await api.get(`/api/orders/seats/${eventId}`)).data,
    enabled: !!eventId,
    refetchInterval: 5_000
  });

  const holdMutation = useMutation({
    mutationFn: async (seatIds: string[]) => (await api.post('/api/orders/holds', { eventId, seatIds })).data as { holdId: string; expiresInSeconds: number },
    onSuccess: (data) => {
      setHoldId(data.holdId);
      setSelected([]); // clear local selection so held seats reflect 'held' styling
      if (eventId) localStorage.setItem(`hold:${eventId}`, data.holdId);
      setTtl(data.expiresInSeconds);
      setTtlSynced(true);
      toast.success(`Seats held for ${data.expiresInSeconds}s`);
      qc.invalidateQueries({ queryKey: ['seats', eventId] });
    },
    onError: (err: any) => {
      const conflicts = err?.response?.data?.conflicts as string[] | undefined;
      if (conflicts?.length) toast.error(`Seat conflict: ${conflicts.join(', ')}`);
      else toast.error(err?.response?.data?.error || 'Failed to hold seats');
    }
  });

  const toggleSeat = (s: Seat) => {
    // Prevent booking another event if a different-event hold exists
    const stored = getStoredHold();
    if (stored && stored.eventId && stored.eventId !== eventId) {
      toast.error('Another event booking is in progress. Continue or cancel it first.');
      return;
    }
    if (holdId) return; // prevent modifying selection while a hold is active
    if (s.state !== 'available') return;
    setSelected((prev) => (prev.includes(s.seatId) ? prev.filter((x) => x !== s.seatId) : [...prev, s.seatId]));
  };

  // Sync TTL from server periodically when a hold is active (read-only; no extend)
  React.useEffect(() => {
    if (!holdId) return;
    let mounted = true;
    const sync = async () => {
      try {
        const r = await api.get(`/api/orders/holds/${holdId}/ttl`);
        if (!mounted) return;
        setTtl(r.data.ttl ?? 0);
        setTtlSynced(true);
      } catch {}
    };
    sync();
    const syncIv = setInterval(sync, 5000);
    return () => { mounted = false; clearInterval(syncIv); };
  }, [holdId]);

  // Local countdown
  React.useEffect(() => {
    if (!holdId) return;
    if (ttlSynced && ttl === 0) {
      // Expired per server: release locally and refresh grid
      setHoldId(null);
      setSelected([]);
      if (eventId) localStorage.removeItem(`hold:${eventId}`);
      toast.error('Hold expired, seats released');
      qc.invalidateQueries({ queryKey: ['seats', eventId] });
      return;
    }
    if (ttl == null || ttl <= 0) return;
    const iv = setInterval(() => setTtl((t) => (t == null ? t : Math.max(0, t - 1))), 1000);
    return () => clearInterval(iv);
  }, [holdId, ttl, ttlSynced, eventId, qc]);

  // On reload, release any locally stored hold to free seats when user confirmed reload
  React.useEffect(() => {
    if (!eventId) return;
    const stored = localStorage.getItem(`hold:${eventId}`);
    if (!stored) return;
    const shouldCancel = sessionStorage.getItem('cancelHoldOnReload') === '1';
    sessionStorage.removeItem('cancelHoldOnReload');
    if (shouldCancel) {
      (async () => {
        try { await api.delete(`/api/orders/holds/${stored}`); } catch {}
        localStorage.removeItem(`hold:${eventId}`);
        setHoldId(null);
        setTtl(null);
        setSelected([]);
        qc.invalidateQueries({ queryKey: ['seats', eventId] });
      })();
    } else {
      setHoldId(stored);
    }
  }, [eventId, qc]);

  // Warn user before refresh/close while a hold is active
  React.useEffect(() => {
    if (!holdId) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Refreshing will cancel your held seats.';
      try { sessionStorage.setItem('cancelHoldOnReload', '1'); } catch {}
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [holdId]);

  const cancelHold = async () => {
    if (!holdId) return;
    try {
      await api.delete(`/api/orders/holds/${holdId}`);
    } catch {}
    setHoldId(null);
    setTtl(0);
    setSelected([]);
    if (eventId) localStorage.removeItem(`hold:${eventId}`);
    qc.invalidateQueries({ queryKey: ['seats', eventId] });
  };

  // UI hover and legend states (must be above conditional returns to keep hook order)
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [legendHover, setLegendHover] = React.useState<'available' | 'held' | 'reserved' | null>(null);
  const neighborSet = React.useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const match = /^R(\d+)-S(\d+)$/.exec(hoveredId);
    if (!match) return new Set<string>();
    const r = parseInt(match[1], 10);
    const c = parseInt(match[2], 10);
    const neigh = new Set<string>();
    [[r, c-1], [r, c+1], [r-1, c], [r+1, c]].forEach(([rr, cc]) => {
      if (rr > 0 && cc > 0) neigh.add(`R${rr}-S${cc}`);
    });
    return neigh;
  }, [hoveredId]);

  if (seatsQuery.isLoading) return <div className="glass p-6 animate-pulse">Loading seats…</div>;
  if (seatsQuery.error || !seatsQuery.data) return <div className="glass p-6">Failed to load seats.</div>;

  const rows = Math.max(...seatsQuery.data.seats.map((s) => s.row));
  const cols = Math.max(...seatsQuery.data.seats.map((s) => s.number));
  const byRowCol = new Map<string, Seat>();
  seatsQuery.data.seats.forEach((s) => byRowCol.set(`${s.row}-${s.number}`, s));
  const rowLabel = (r: number) => String.fromCharCode('A'.charCodeAt(0) + r - 1);
  const foreignHold = (() => {
    const stored = getStoredHold();
    if (!stored) return null;
    if (stored.eventId && stored.eventId !== eventId) return stored;
    return null;
  })();

  const formatSeatId = (id: string) => {
    const m = /^R(\d+)-S(\d+)$/.exec(id);
    if (!m) return id;
    const r = parseInt(m[1], 10);
    const c = parseInt(m[2], 10);
    const rowLabel = String.fromCharCode('A'.charCodeAt(0) + (r - 1));
    return `${rowLabel}${c}`;
  };

  return (
    <div className="space-y-4 relative">
      {/* Ambient glow vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{ background: 'radial-gradient(1200px 600px at 50% 0%, rgba(59,130,246,0.06), transparent 60%), radial-gradient(800px 400px at 0% 100%, rgba(34,197,94,0.05), transparent 60%), radial-gradient(800px 400px at 100% 100%, rgba(236,72,153,0.05), transparent 60%)' }} />
      <div className="flex items-center gap-4 glass p-2 w-fit">
        <button onMouseEnter={() => setLegendHover('available')} onMouseLeave={() => setLegendHover(null)} className="flex items-center gap-2 focus:outline-none">
          <span className="w-3 h-3 rounded-sm holo-available glow-cyan" /> <span className="text-sm text-neutral-300">Available</span>
        </button>
        <button onMouseEnter={() => setLegendHover('held')} onMouseLeave={() => setLegendHover(null)} className="flex items-center gap-2 focus:outline-none">
          <span className="w-3 h-3 rounded-sm holo-held glow-amber" /> <span className="text-sm text-neutral-300">Held</span>
        </button>
        <button onMouseEnter={() => setLegendHover('reserved')} onMouseLeave={() => setLegendHover(null)} className="flex items-center gap-2 focus:outline-none">
          <span className="w-3 h-3 rounded-sm holo-reserved glow-reserved" /> <span className="text-sm text-neutral-300">Reserved</span>
        </button>
      </div>

      {foreignHold && (
        <div className="glass p-4 mb-4 flex items-center justify-between">
          <div className="text-sm text-neutral-300">You have an active hold on another event. Please continue or cancel it before selecting new seats.</div>
          <Link to={`/events/${foreignHold.eventId}/seats`} className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-sm">Continue booking</Link>
        </div>
      )}
      <div className={`glass p-4 overflow-auto flex flex-col items-center ${foreignHold ? 'pointer-events-none opacity-60' : ''}` }>
        {/* Holographic stage */}
        <div className="relative text-center text-neutral-200 mb-6">
          <div className="mx-auto glass-holo w-full max-w-lg px-8 py-3 relative overflow-hidden">
            <div className="absolute inset-x-0 -top-full h-16 scan-line animate-scan opacity-40" />
            <span className="tracking-wider drop-shadow font-medium">Stage</span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">View this side</div>
        </div>
        <div className="inline-grid gap-2 mx-auto" style={{ gridTemplateColumns: `repeat(${cols + 1}, minmax(0, 1fr))` }}>
          <div />
          {Array.from({ length: cols }).map((_, c) => (
            <div key={`col-${c + 1}`} className="text-center text-xs text-neutral-400">{c + 1}</div>
          ))}
          {Array.from({ length: rows }).map((_, rIdx) => {
            const r = rIdx + 1;
            return (
              <React.Fragment key={`row-${r}`}>
                <div className="flex items-center justify-center text-xs text-neutral-400">{rowLabel(r)}</div>
                {Array.from({ length: cols }).map((_, cIdx) => {
                  const c = cIdx + 1;
                  const s = byRowCol.get(`${r}-${c}`)!;
                  const interactive = s.state === 'available';
                  const isSelected = selected.includes(s.seatId) && !holdId; // only show 'selected' before hold is created
                  const state: 'available' | 'held' | 'reserved' | 'selected' = isSelected ? 'selected' : s.state;
                  return (
                    <Seat
                      key={s.seatId}
                      id={s.seatId}
                      label={formatSeatId(s.seatId)}
                      state={state}
                      disabled={!interactive && state !== 'selected'}
                      onClick={() => toggleSeat(s)}
                      onHoverRipple={(id) => setHoveredId(id)}
                      onHoverEndRipple={() => setHoveredId(null)}
                      neighborPulse={neighborSet.has(s.seatId) || (!!legendHover && state === legendHover)}
                      highlight={hoveredId === s.seatId}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 sticky bottom-3 z-10">
        <button
          onClick={() => holdMutation.mutate(selected)}
          disabled={!!foreignHold || !!holdId || selected.length === 0 || holdMutation.isPending}
          className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
        >
          {holdId ? 'Active hold' : holdMutation.isPending ? 'Holding…' : `Hold ${selected.length} seat(s)`}
        </button>
        {holdId && (
          <div className="flex items-center gap-3">
            <span aria-live="polite" className="text-sm text-neutral-300">Hold expires in {ttl == null ? '—' : `${String(Math.floor((ttl ?? 0) / 60)).padStart(2, '0')}:${String((ttl ?? 0) % 60).padStart(2, '0')}`}</span>
            <button onClick={cancelHold} className="px-3 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/20">Cancel</button>
            <button
              onClick={async () => {
                let seatsToSend = selected;
                if (seatsToSend.length === 0 && holdId) {
                  try {
                    const r = await api.get(`/api/orders/holds/${holdId}/details`);
                    seatsToSend = Array.isArray(r.data?.seatIds) ? r.data.seatIds : [];
                  } catch {}
                }
                navigate('/checkout', { state: { eventId, holdId, seatIds: seatsToSend.length ? seatsToSend : undefined } });
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-brand-600 hover:bg-brand-500"
            >
              Proceed to pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



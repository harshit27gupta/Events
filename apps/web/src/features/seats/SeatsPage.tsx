import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'sonner';

type Seat = { seatId: string; row: number; number: number; state: 'available' | 'held' | 'reserved' };
type SeatsResponse = { eventId: string; seats: Seat[] };

const stateColors: Record<Seat['state'], string> = {
  available: 'bg-emerald-500 hover:bg-emerald-400',
  held: 'bg-amber-500',
  reserved: 'bg-rose-600'
};

export function SeatsPage() {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [holdId, setHoldId] = React.useState<string | null>(null);
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
    if (s.state !== 'available') return;
    setSelected((prev) => (prev.includes(s.seatId) ? prev.filter((x) => x !== s.seatId) : [...prev, s.seatId]));
  };

  if (seatsQuery.isLoading) return <div className="glass p-6 animate-pulse">Loading seats…</div>;
  if (seatsQuery.error || !seatsQuery.data) return <div className="glass p-6">Failed to load seats.</div>;

  const rows = Math.max(...seatsQuery.data.seats.map((s) => s.row));
  const cols = Math.max(...seatsQuery.data.seats.map((s) => s.number));
  const byRowCol = new Map<string, Seat>();
  seatsQuery.data.seats.forEach((s) => byRowCol.set(`${s.row}-${s.number}`, s));
  const rowLabel = (r: number) => String.fromCharCode('A'.charCodeAt(0) + r - 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> <span className="text-sm text-neutral-300">Available</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-500" /> <span className="text-sm text-neutral-300">Held</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-rose-600" /> <span className="text-sm text-neutral-300">Reserved</span></div>
      </div>

      <div className="glass p-4 overflow-auto">
        <div className="text-center text-neutral-400 text-sm mb-3">Screen</div>
        <div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${cols + 1}, minmax(0, 1fr))` }}>
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
                  const isSelected = selected.includes(s.seatId);
                  const interactive = s.state === 'available';
                  const base = interactive ? stateColors.available : stateColors[s.state];
                  const cls = isSelected ? 'ring-2 ring-white/80' : '';
                  return (
                    <button
                      key={s.seatId}
                      onClick={() => toggleSeat(s)}
                      disabled={!interactive}
                      aria-label={`Row ${rowLabel(r)} Seat ${c} ${s.state}`}
                      className={`w-8 h-8 rounded-sm text-[10px] flex items-center justify-center select-none ${base} ${cls} disabled:opacity-40`}
                      title={`${rowLabel(r)}-${c} • ${s.state}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => holdMutation.mutate(selected)}
          disabled={selected.length === 0 || holdMutation.isPending}
          className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
        >
          {holdMutation.isPending ? 'Holding…' : `Hold ${selected.length} seat(s)`}
        </button>
        {/* Hold id kept client-side for later purchase step; not shown to users */}
      </div>
    </div>
  );
}



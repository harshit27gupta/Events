import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import QRCode from 'react-qr-code';
import { useAuth } from '../auth/useAuth';

export default function TicketPage() {
  const { orderId } = useParams();
  const [sp] = useSearchParams();
  const { data: me } = useAuth();
  const { data: orderResp, isLoading: orderLoading, error: orderErr } = useQuery({
    queryKey: ['public-order', orderId],
    queryFn: async () => (await api.get(`/api/public/orders/${orderId}`)).data,
    enabled: !!orderId
  });
  const { data: eventResp } = useQuery({
    queryKey: ['event-for-order', orderResp?.order?.eventId],
    queryFn: async () => (await api.get(`/api/events/${orderResp.order.eventId}`)).data,
    enabled: !!orderResp?.order?.eventId
  });

  const url = React.useMemo(() => window.location.origin + `/ticket/${orderId}`, [orderId]);
  const classic = sp.get('style') === 'classic';

  if (orderLoading) return <div className="glass p-6 animate-pulse">Loading ticket…</div>;
  if (orderErr || !orderResp?.order) return <div className="glass p-6">Ticket not found.</div>;

  const evt: any = eventResp || {};
  const seatLabel = (id: string) => {
    const m = /^R(\d+)-S(\d+)$/.exec(id);
    if (!m) return id;
    const r = parseInt(m[1], 10);
    const c = parseInt(m[2], 10);
    const rowLabel = String.fromCharCode('A'.charCodeAt(0) + (r - 1));
    return `${rowLabel}${c}`;
  };
  const holderName = sp.get('name') || me?.email || 'Guest User';
  const pricePerSeat = 500; // INR, simulation consistent with checkout
  const totalPrice = (orderResp.order.seatIds?.length || 1) * pricePerSeat;
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Classic fallback UI (via ?style=classic) */}
      {classic ? (
        <div className="glass-holo p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm text-neutral-400">events.ai e‑ticket</div>
              <h1 className="text-2xl font-semibold">{evt.title || orderResp.order.eventId}</h1>
              {evt.location && <div className="text-neutral-400">{evt.location}</div>}
              {evt.date && <div className="text-neutral-400">{new Date(evt.date).toLocaleString()}</div>}
              <div className="mt-3 text-neutral-300">Seats: {orderResp.order.seatIds?.map(seatLabel).join(', ')}</div>
              <div className="text-xs text-neutral-500 mt-1">Order ID: <span className="font-mono">{orderResp.order.orderId}</span></div>
              <div className="text-xs text-emerald-400 mt-1">Status: {orderResp.order.status}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shrink-0">
              <QRCode value={url} size={160} />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-925/80 backdrop-blur-xl shadow-glass">
          {/* Top banner */}
          <div className="px-6 py-6 bg-gradient-to-br from-[#0b0f1a] via-[#0c0a16] to-[#0b0f1a]">
            <div className="flex items-center justify-between">
              <div>
                <div className="uppercase tracking-wider text-[11px] text-neutral-400">Digital Pass</div>
                <h1 className="text-3xl md:text-[34px] leading-tight font-extrabold text-gradient-holo">{evt.title || 'Event'}</h1>
              </div>
              <div className="rounded-xl px-3 py-2 bg-white/5 border border-white/10 text-xs text-neutral-300">events.ai</div>
            </div>
          </div>
          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Content */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: details */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[15px]">
                <div>
                  <div className="text-neutral-400">Ticket Holder</div>
                  <div className="font-semibold text-neutral-100 truncate">{holderName}</div>
                </div>
                <div>
                  <div className="text-neutral-400">Ticket ID</div>
                  <div className="font-mono text-sm text-neutral-300 break-all">{orderResp.order.orderId}</div>
                </div>
                <div>
                  <div className="text-neutral-400">Date</div>
                  <div className="font-semibold">{evt.date ? new Date(evt.date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-neutral-400">Time</div>
                  <div className="font-semibold">{evt.date ? new Date(evt.date).toLocaleTimeString() : '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-neutral-400">Seat(s)</div>
                  <div className="font-semibold">{orderResp.order.seatIds?.map(seatLabel).join(', ')}</div>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="text-neutral-400">Total Paid</div>
                <div className="text-2xl font-extrabold text-brand-300">{currency}</div>
              </div>
            </div>

            {/* Right: QR */}
            <div className="flex flex-col items-center md:items-end">
              <div className="bg-white p-5 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] border border-white">
                <QRCode value={url} size={184} />
              </div>
              <div className="text-[10px] text-neutral-500 font-mono mt-2">Scan to verify • {orderResp.order.orderId}</div>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="px-6 py-4 bg-gradient-to-r from-brand-600/15 via-fuchsia-500/12 to-cyan-400/15 border-t border-white/10 flex items-center justify-between text-xs text-neutral-300">
            <div>Location: {evt.location || 'See event page for details'}</div>
            <div>Status: <span className="text-emerald-400 font-semibold">{orderResp.order.status}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}



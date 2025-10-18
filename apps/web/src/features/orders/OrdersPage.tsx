import React from 'react';
import { useAuth } from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, Download, ExternalLink, MapPin, Package, Share2, Ticket } from 'lucide-react';

export function OrdersPage() {
  const { data: me, isLoading } = useAuth();
  const location = useLocation();
  const { data } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/api/orders/orders')).data,
    enabled: !!me
  });
  const prefersReducedMotion = useReducedMotion();

  const EventTitle: React.FC<{ eventId: string }> = ({ eventId }) => {
    const { data: evt } = useQuery({
      queryKey: ['event', eventId],
      queryFn: async () => (await api.get(`/api/events/${eventId}`)).data,
      enabled: !!eventId
    });
    return <>{evt?.title || eventId}</>;
  };
  const EventInfo: React.FC<{ eventId: string }> = ({ eventId }) => {
    const { data: evt } = useQuery({
      queryKey: ['event', eventId, 'info'],
      queryFn: async () => (await api.get(`/api/events/${eventId}`)).data,
      enabled: !!eventId
    });
    if (!evt) return null as any;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-brand-400" />
          <span className="text-lg">{new Date(evt.date).toLocaleString()}</span>
        </div>
        {evt.location && (
          <div className="flex items-center gap-3">
            <MapPin className="text-brand-400" />
            <span>{evt.location}</span>
          </div>
        )}
      </div>
    );
  };
  const formatSeatId = (id: string) => {
    const m = /^R(\d+)-S(\d+)$/.exec(id);
    if (!m) return id;
    const r = parseInt(m[1], 10);
    const c = parseInt(m[2], 10);
    const rowLabel = String.fromCharCode('A'.charCodeAt(0) + (r - 1));
    return `${rowLabel}${c}`;
  };
  if (isLoading) {
    return <div className="glass p-6 animate-pulse">Loading…</div>;
  }
  if (!me) {
    return (
      <div className="glass p-6 text-center">
        <div className="text-lg font-semibold mb-1">Please log in to see your orders</div>
        <div className="text-neutral-400">You need an account to view your purchase history.</div>
      </div>
    );
  }
  const justCreated = (location.state as any)?.order;
  const orders: any[] = Array.isArray(data?.orders) ? data!.orders : [];
  const sortedOrders = React.useMemo(() => {
    try {
      return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return orders;
    }
  }, [orders]);
  const primaryOrder = justCreated || sortedOrders[0];
  const ticketUrlFor = (order: any | null | undefined) => order ? `/ticket/${encodeURIComponent(order.orderId || order._id)}` : '#';
  const openTicket = React.useCallback((order: any | null | undefined) => {
    if (!order) return;
    const orderId = order.orderId || order._id;
    if (!orderId) return;
    const url = `/ticket/${encodeURIComponent(orderId)}`;
    const full = window.location.origin + url;
    try { 
      const newWindow = window.open(full, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        window.location.assign(url);
      }
    } catch (err) {
      window.location.assign(url); 
    }
  }, []);
  const handleShare = React.useCallback(() => {
    const shareUrl = window.location.origin + '/orders';
    const title = 'I just booked tickets on events.ai!';
    if ((navigator as any).share) {
      (navigator as any).share({ title, url: shareUrl }).catch(() => {});
    } else {
      try { navigator.clipboard.writeText(shareUrl); } catch {}
    }
  }, []);
  const calendarUrl = (evt?: any) => {
    if (!evt) return '#';
    const start = new Date(evt.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(evt.title || 'Event');
    const details = encodeURIComponent('Created via events.ai');
    const locationText = encodeURIComponent(evt.location || '');
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${locationText}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {justCreated && (
        <motion.section
          className="glass-holo p-8 relative overflow-hidden lg:col-span-2"
          initial={prefersReducedMotion ? false : { scale: 0.97, opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className="portal-burst" />
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-4"
            animate={prefersReducedMotion ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: 0 }}
            aria-hidden
          >
            <CheckCircle2 className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gradient-holo mb-2">Booking confirmed!</h1>
          <div className="text-sm text-neutral-400 mb-2">Order ID: <span className="font-mono text-neutral-300">{justCreated.orderId}</span></div>
          <div className="mb-4">
            <div className="text-lg font-semibold mb-1"><EventTitle eventId={justCreated.eventId} /></div>
            <EventInfo eventId={justCreated.eventId} />
            <div className="flex items-center gap-3 mt-3">
              <Ticket className="text-brand-400" />
              <span className="text-xl font-semibold">Seats: {justCreated.seatIds?.map(formatSeatId).join(', ')}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <button 
              onClick={() => openTicket(justCreated)} 
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer relative z-10"
              type="button"
            >
              <ExternalLink /> View Ticket
            </button>
            <a
              className="px-6 py-3 rounded-xl glass border-brand-400/30 hover:border-brand-400 flex items-center gap-2"
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const r = await api.get(`/api/events/${justCreated.eventId}`);
                  const url = calendarUrl(r.data);
                  window.open(url, '_blank');
                } catch {}
              }}
            >
              <CalendarPlus /> Add to Calendar
            </a>
            <button onClick={handleShare} className="px-4 py-3 rounded-xl glass hover:bg-white/10" aria-label="Share">
              <Share2 />
            </button>
          </div>
        </motion.section>
      )}

      {/* QR preview removed by request */}

      {/* Map location card removed by request */}

      <section className="glass p-6 lg:col-span-3">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Package className="text-brand-400" /> Your Events</h2>
        {!data?.orders?.length ? (
          <div className="text-neutral-400 text-sm">No orders yet.</div>
        ) : (
          <div className="space-y-2">
            {data.orders.map((o: any, idx: number) => (
              <motion.div
                key={o._id}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : idx * 0.05 }}
                whileHover={prefersReducedMotion ? undefined : { x: 4 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-400/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-brand-600/20 flex items-center justify-center shrink-0">
                    <Ticket className="text-brand-400" />
                  </div>
                  <div>
                    <div className="font-semibold"><Link to={`/events/${o.eventId}`} className="hover:text-white text-neutral-200"><EventTitle eventId={o.eventId} /></Link></div>
                    <div className="text-sm text-neutral-400">{o.seatIds?.length} seat(s) • {o.seatIds?.map(formatSeatId).join(', ')}</div>
                    <div className="text-xs text-neutral-500 mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">{o.status}</span>
                  <button onClick={() => openTicket(o)} className="px-2 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs">View</button>
                  <ChevronRight className="text-neutral-600" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}



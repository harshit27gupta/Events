import React from 'react';
import { useAuth } from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useLocation } from 'react-router-dom';

export function OrdersPage() {
  const { data: me, isLoading } = useAuth();
  const location = useLocation();
  const { data } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/api/orders/orders')).data,
    enabled: !!me
  });

  const EventTitle: React.FC<{ eventId: string }> = ({ eventId }) => {
    const { data: evt } = useQuery({
      queryKey: ['event', eventId],
      queryFn: async () => (await api.get(`/api/events/${eventId}`)).data,
      enabled: !!eventId
    });
    return <>{evt?.title || eventId}</>;
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
  return (
    <div className="space-y-4">
      {justCreated && (
        <div className="glass p-4">
          <div className="text-lg font-semibold mb-1">Booking complete</div>
          <div className="text-neutral-300 text-sm">Order ID: {justCreated.orderId}</div>
          <div className="text-neutral-300 text-sm">Event: <EventTitle eventId={justCreated.eventId} /></div>
          <div className="text-neutral-300 text-sm">Seats: {justCreated.seatIds?.join(', ')}</div>
          <div className="text-neutral-300 text-sm">Status: {justCreated.status}</div>
        </div>
      )}
      <div className="glass p-4">
        <div className="text-lg font-semibold mb-3">Your orders</div>
        {!data?.orders?.length ? (
          <div className="text-neutral-400 text-sm">No orders yet.</div>
        ) : (
          <div className="space-y-2">
            {data.orders.map((o: any) => (
              <div key={o._id} className="flex items-center justify-between bg-white/5 rounded-md px-3 py-2">
                <div className="text-sm">
                  <div className="text-neutral-200">Order {o._id} • <span className="text-neutral-300"><EventTitle eventId={o.eventId} /></span></div>
                  <div className="text-neutral-400">Seats: {o.seatIds?.join(', ')} • {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-xs px-2 py-1 rounded bg-white/10">{o.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



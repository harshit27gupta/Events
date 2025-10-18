import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useHold } from '../seats/HoldContext';

type CheckoutState = {
  eventId: string;
  holdId: string;
  seatIds: string[];
  amount?: number;
};

function getIdempotencyKey() {
  try { return crypto.randomUUID(); } catch { return String(Date.now()) + Math.random().toString(16).slice(2); }
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hold = useHold();
  const state = (location.state || {}) as Partial<CheckoutState>;
  const [busy, setBusy] = React.useState(false);
  const [intentId, setIntentId] = React.useState<string | null>(null);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  const eventId = state.eventId || hold.eventId || '';
  const holdId = state.holdId || hold.holdId || '';
  const [seatIds, setSeatIds] = React.useState<string[]>(Array.isArray(state.seatIds) ? state.seatIds : []);
  // Fallback: fetch hold details if seatIds missing but we have a holdId
  React.useEffect(() => {
    (async () => {
      if (seatIds.length === 0 && holdId) {
        try {
          const r = await api.get(`/api/orders/holds/${holdId}/details`);
          setSeatIds(Array.isArray(r.data?.seatIds) ? r.data.seatIds : []);
        } catch {}
      }
    })();
  }, [holdId, seatIds.length]);
  const amount = state.amount ?? seatIds.length * 500;

  const createIntent = async () => {
    setBusy(true);
    try {
      const r = await api.post('/api/orders/payments/intent', { amount, currency: 'INR' });
      setIntentId(r.data.paymentIntentId);
      setClientSecret(r.data.clientSecret);
      toast.success('Payment intent created');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to create payment');
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async () => {
    if (!intentId || !clientSecret) return;
    setBusy(true);
    try {
      await api.post('/api/orders/payments/confirm', { paymentIntentId: intentId, clientSecret });
      toast.success('Payment confirmed');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setBusy(false);
    }
  };

  const completePurchase = async () => {
    if (!intentId) return;
    setBusy(true);
    try {
      // Validate hold is still active before purchase
      const ttlResp = await api.get(`/api/orders/holds/${holdId}/ttl`);
      if (!ttlResp.data || (ttlResp.data.ttl ?? 0) <= 0) {
        toast.error('Hold expired. Please reselect seats.');
        navigate(`/events/${eventId}/seats`);
        return;
      }
      const headers = { 'Idempotency-Key': getIdempotencyKey() } as any;
      const r = await api.post('/api/orders/purchase', { eventId, holdId, seatIds, paymentIntentId: intentId }, { headers });
      // Clear any local hold artifacts
      try { localStorage.removeItem(`hold:${eventId}`); } catch {}
      toast.success('Booking confirmed');
      navigate('/orders', { state: { order: r.data } });
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Failed to complete purchase';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!eventId || !holdId || seatIds.length === 0) {
    return <div className="glass p-6">Missing checkout data. Please select seats again.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="text-lg font-semibold mb-2">Order summary</div>
        <div className="text-sm text-neutral-300">Event: {eventId}</div>
        <div className="text-sm text-neutral-300">Seats: {seatIds.join(', ')}</div>
        <div className="text-sm text-neutral-300">Amount: ₹{amount}</div>
      </div>
      <div className="glass p-4 space-y-3">
        {!intentId ? (
          <button disabled={busy} onClick={createIntent} className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50">Create payment</button>
        ) : (
          <div className="space-x-2">
            <button disabled={busy} onClick={confirmPayment} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50">Confirm payment</button>
            <button disabled={busy} onClick={completePurchase} className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50">Complete booking</button>
          </div>
        )}
      </div>
    </div>
  );
}



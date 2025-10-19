import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useHold } from '../seats/HoldContext';
import { Button } from '../../components/Button';

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
  const [paid, setPaid] = React.useState(false);
  const [eventTitle, setEventTitle] = React.useState<string>('');

  const eventId = state.eventId || hold.eventId || '';
  const holdId = state.holdId || hold.holdId || '';
  const [seatIds, setSeatIds] = React.useState<string[]>(Array.isArray(state.seatIds) ? state.seatIds : []);
  const formatSeatId = React.useCallback((id: string) => {
    const m = /^R(\d+)-S(\d+)$/.exec(id);
    if (!m) return id;
    const rowNum = parseInt(m[1], 10);
    const seatNum = parseInt(m[2], 10);
    const rowLabel = String.fromCharCode('A'.charCodeAt(0) + (rowNum - 1));
    return `${rowLabel}${seatNum}`;
  }, []);
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
  React.useEffect(() => {
    (async () => {
      if (eventId) {
        try { const r = await api.get(`/api/events/${eventId}`); setEventTitle(r.data?.title || ''); } catch {}
      }
    })();
  }, [eventId]);
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
      const r = await api.post('/api/orders/payments/confirm', { paymentIntentId: intentId, clientSecret });
      toast.success(`Payment confirmed [Request ID: ${r.headers['x-request-id']}]`);
      setPaid(true);
    } catch (e: any) {
      const status = e?.response?.status;
      const requestId = e?.response?.headers['x-request-id'] || 'unknown';
      if (status === 409) {
        toast.error(`Conflict detected while confirming payment. Try again. [Request ID: ${requestId}]`);
      } else {
        toast.error(`Failed to confirm payment [Request ID: ${requestId}]`);
      }
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
      toast.success(`Booking confirmed [Request ID: ${r.headers['x-request-id']}]`);
      // Clear any local hold artifacts
      try { localStorage.removeItem(`hold:${eventId}`); } catch {}
      navigate('/orders', { state: { order: r.data } });
    } catch (e: any) {
      const status = e?.response?.status;
      const requestId = e?.response?.headers['x-request-id'] || 'unknown';
      if (status === 409) {
        toast.error(`Hold conflict detected. Please retry. [Request ID: ${requestId}]`);
      } else if (status === 402) {
        toast.error(`Payment required to complete booking. [Request ID: ${requestId}]`);
      } else if (status === 404) {
        toast.error(`Seats no longer available. Please choose again. [Request ID: ${requestId}]`);
      } else {
        toast.error(`Failed to complete purchase [Request ID: ${requestId}]`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!eventId || !holdId || seatIds.length === 0) {
    return <div className="glass p-6">Missing checkout data. Please select seats again.</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <div className="glass p-6">
          <div className="mb-4">
            <div className="text-lg font-semibold">Checkout</div>
            <div className="text-xs text-neutral-400">Secure simulated payment</div>
          </div>
          <ol className="grid grid-cols-3 text-center text-xs text-neutral-300">
            <li className={`py-2 rounded ${!intentId ? 'bg-white/10 text-white' : 'bg-white/5'}`}>1. Create intent</li>
            <li className={`py-2 rounded ${intentId && !paid ? 'bg-white/10 text-white' : 'bg-white/5'}`}>2. Confirm payment</li>
            <li className={`py-2 rounded ${paid ? 'bg-white/10 text-white' : 'bg-white/5'}`}>3. Complete booking</li>
          </ol>
        </div>
        <div className="glass p-6 space-y-3">
          {!intentId ? (
            <Button disabled={busy} onClick={createIntent}>Create payment</Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={busy || paid} variant="secondary" onClick={confirmPayment}>{paid ? 'Payment confirmed' : 'Confirm payment'}</Button>
              <Button disabled={busy || !paid} onClick={completePurchase}>Complete booking</Button>
            </div>
          )}
        </div>
      </div>
      <aside className="space-y-3">
        <div className="glass p-6">
          <div className="text-sm text-neutral-400">Event</div>
          <div className="text-base font-medium">{eventTitle || eventId}</div>
          <div className="mt-3 text-sm text-neutral-400">Seats</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {seatIds.map((s) => <span key={s} className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/10">{formatSeatId(s)}</span>)}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-neutral-300">Subtotal</span>
            <span className="text-neutral-100">₹{amount}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-neutral-300">Fees</span>
            <span className="text-neutral-100">₹0</span>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
            <span className="text-neutral-300">Total</span>
            <span className="text-neutral-100 font-semibold">₹{amount}</span>
          </div>
        </div>
        <div className="text-xs text-neutral-400">Simulated payment only. No real charges.</div>
      </aside>
    </div>
  );
}



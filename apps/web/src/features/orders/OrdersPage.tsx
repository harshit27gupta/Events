import React from 'react';
import { useAuth } from '../auth/useAuth';

export function OrdersPage() {
  const { data: me, isLoading } = useAuth();
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
  return <div className="glass p-6">Your orders will appear here soon.</div>;
}



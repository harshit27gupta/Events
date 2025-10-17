import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EventCard } from './EventCard';

export function EventsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/api/events')).data
  });
  const [q, setQ] = React.useState('');

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass h-40 animate-pulse" />
        ))}
      </div>
    );
  }
  if (error) return <div className="text-red-300">Failed to load events.</div>;

  const items = Array.isArray(data) ? data : [];
  const filtered = q ? items.filter((e: any) => e.title?.toLowerCase().includes(q.toLowerCase())) : items;
  if (items.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <div className="text-lg font-semibold mb-1">No events yet</div>
        <div className="text-neutral-400">Check back soon for upcoming events.</div>
      </div>
    );
  }
  return (
    <>
      <div className="mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events…" className="w-full sm:w-80 bg-neutral-800/60 border border-white/10 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((e: any) => (
          <EventCard key={e._id} e={e} />
        ))}
      </div>
    </>
  );
}



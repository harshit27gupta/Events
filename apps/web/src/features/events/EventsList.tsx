import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function EventsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/api/events')).data
  });

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
  if (items.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <div className="text-lg font-semibold mb-1">No events yet</div>
        <div className="text-neutral-400">Check back soon for upcoming events.</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((e: any) => (
        <div key={e._id} className="glass p-4">
          <div className="text-sm text-neutral-300">{new Date(e.date).toLocaleString()}</div>
          <div className="text-lg font-semibold">{e.title}</div>
          {e.location && <div className="text-neutral-400 text-sm">{e.location}</div>}
        </div>
      ))}
    </div>
  );
}



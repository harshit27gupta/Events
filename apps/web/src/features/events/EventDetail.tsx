import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function EventDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => (await api.get(`/api/events/${id}`)).data,
    enabled: !!id
  });

  if (isLoading) return <div className="glass p-8 animate-pulse">Loading…</div>;
  if (error || !data) return <div className="glass p-8">Event not found.</div>;

  const e: any = data;
  return (
    <div className="glass p-6">
      <div className="text-sm text-neutral-300">{new Date(e.date).toLocaleString()}</div>
      <h1 className="text-2xl font-semibold mb-2">{e.title}</h1>
      {e.location && <div className="text-neutral-400 mb-4">{e.location}</div>}
      {e.description && <p className="text-neutral-300 mb-4">{e.description}</p>}
      <div className="flex items-center gap-2">
        <a href={`/events/${id}/seats`} className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500">Select seats</a>
      </div>
    </div>
  );
}



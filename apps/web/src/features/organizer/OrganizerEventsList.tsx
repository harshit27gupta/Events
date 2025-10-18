import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function OrganizerEventsList() {
  const { data: me, isLoading: meLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/api/events')).data
  });

  if (meLoading || isLoading) return <div className="glass p-6 animate-pulse">Loading…</div>;
  if (!me || (me.role !== 'organizer' && me.role !== 'admin')) {
    return <div className="glass p-6">Organizer access required.</div>;
  }
  if (error) return <div className="glass p-6">Failed to load events.</div>;
  const items = Array.isArray(data) ? data : [];
  const mine = items.filter((e: any) => e.organizerId === me.userId);
  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/api/events/${id}`);
      await qc.invalidateQueries({ queryKey: ['events'] });
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">My events</div>
        <button onClick={() => navigate('/organizer/events/new')} className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-sm">New event</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mine.length === 0 ? (
          <div className="glass p-6 col-span-full text-center text-neutral-300">No events yet.</div>
        ) : mine.map((e: any) => (
          <div key={e._id} className="glass p-4">
            <div className="text-sm text-neutral-300">{new Date(e.date).toLocaleString()}</div>
            <div className="text-lg font-semibold">{e.title}</div>
            {e.location && <div className="text-neutral-400 text-sm">{e.location}</div>}
            <div className="mt-3 flex items-center gap-2">
              <Link to={`/organizer/events/${e._id}/edit`} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm">Edit</Link>
              <Link to={`/events/${e._id}`} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm">View</Link>
              <button onClick={() => remove(e._id)} className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



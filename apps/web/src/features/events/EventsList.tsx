import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EventCard } from './EventCard';
import { useActiveHold } from '../seats/useActiveHold';
import { Link } from 'react-router-dom';
import { Input } from '../../components/Input';
import { motion } from 'framer-motion';

export function EventsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/api/events')).data
  });
  const [q, setQ] = React.useState('');
  const active = useActiveHold();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
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
      {active.isActive && (
        <div className="glass p-4 mb-4 flex items-center justify-between">
          <div className="text-sm text-neutral-300">You have a seat hold in progress. Time left {String(Math.floor(active.ttl / 60)).padStart(2,'0')}:{String(active.ttl % 60).padStart(2,'0')}</div>
          <Link to={`/events/${active.eventId}/seats`} className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-sm">Continue booking</Link>
        </div>
      )}
      <div className="mb-6">
        <div className="w-full sm:w-96">
          <Input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder="Search events…" aria-label="Search events" />
        </div>
      </div>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        initial={typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : 'hidden'}
        animate={typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : 'show'}
      >
        {filtered.slice(0, 12).map((e: any) => (
          <motion.div key={e._id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}>
            <EventCard e={e} />
          </motion.div>
        ))}
        {filtered.slice(12).map((e: any) => (
          <div key={e._id}>
            <EventCard e={e} />
          </div>
        ))}
      </motion.div>
    </>
  );
}



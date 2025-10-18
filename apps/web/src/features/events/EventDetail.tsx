import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { getStoredHold } from '../seats/useActiveHold';

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
  const stored = getStoredHold();
  const foreignHold = stored && stored.eventId !== id ? stored : null;
  const fallbackFor = (title: string, tags: string[] | undefined) => {
    const t = (title || '').toLowerCase();
    const joined = (tags || []).join(' ').toLowerCase();
    const hay = `${t} ${joined}`;
    if (/(art|gallery|exhibit|painting)/.test(hay)) return '/images/art_image.png';
    if (/(fashion|runway|style)/.test(hay)) return '/images/fashion_image.png';
    if (/(food|dinner|culinary|tasting|restaurant|chef)/.test(hay)) return '/images/food_event_image.png';
    if (/(music|concert|band|dj)/.test(hay)) return '/images/music_image.png';
    if (/(tech|developer|conference|hack|ai|ml)/.test(hay)) return '/images/tech_image.png';
    if (/(football|soccer)/.test(hay)) return '/images/football_image.png';
    if (/(cricket)/.test(hay)) return '/images/cricket_image.png';
    if (/(startup|meetup|networking|pitch)/.test(hay)) return '/images/startup_meet_image.png';
    if (/(comedy|stand ?up|laugh)/.test(hay)) return '/images/comedy_nights_image.png';
    return '/images/music_image.png';
  };
  return (
    <div className="glass p-6">
      <div className="w-full mb-4 rounded-lg overflow-hidden border border-white/10 bg-white/5">
        <img
          src={e.imageUrl ? (/^https?:\/\//.test(e.imageUrl) ? e.imageUrl : `/images/${String(e.imageUrl).replace(/^\/+/, '')}`) : fallbackFor(e.title, Array.isArray(e.tags) ? e.tags : undefined)}
          alt={e.title}
          className="w-full h-64 md:h-80 object-cover"
        />
      </div>
      <div className="text-sm text-neutral-300">{new Date(e.date).toLocaleString()}</div>
      <h1 className="text-2xl font-semibold mb-2">{e.title}</h1>
      {e.location && <div className="text-neutral-400 mb-4">{e.location}</div>}
      {e.description && <p className="text-neutral-300 mb-4">{e.description}</p>}
      {foreignHold && (
        <div className="glass p-4 mb-4 flex items-center justify-between">
          <div className="text-sm text-neutral-300">You have an active hold on another event. Continue or cancel it first.</div>
          <Link to={`/events/${foreignHold.eventId}/seats`} className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-sm">Continue booking</Link>
        </div>
      )}
      <div className="flex items-center gap-2">
        <a href={`/events/${id}/seats`} className={`px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 ${foreignHold ? 'pointer-events-none opacity-60' : ''}`}>Select seats</a>
      </div>
    </div>
  );
}



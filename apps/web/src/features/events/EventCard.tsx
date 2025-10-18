import React from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

export function EventCard({ e }: { e: any }) {
  const qc = useQueryClient();
  const prefetch = React.useCallback(() => {
    qc.prefetchQuery({ queryKey: ['event', e._id], queryFn: async () => (await fetch(((import.meta as any).env.VITE_API_URL || 'http://localhost:8080') + `/api/events/${e._id}`)).json(), staleTime: 30_000 });
    qc.prefetchQuery({ queryKey: ['seats', e._id], queryFn: async () => (await fetch(((import.meta as any).env.VITE_API_URL || 'http://localhost:8080') + `/api/orders/seats/${e._id}`, { credentials: 'include' })).json(), staleTime: 10_000 });
  }, [qc, e._id]);
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
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link to={`/events/${e._id}`} onMouseEnter={prefetch} onFocus={prefetch} aria-label={`View details for ${e.title}`} className="glass block transition-all duration-200 hover:border-white/20 hover:shadow-lg">
        <div className="p-5 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-neutral-300 truncate">{new Date(e.date).toLocaleString()}</div>
            <div className="text-lg font-semibold truncate group-hover:text-brand-400 transition-colors">{e.title}</div>
            {e.location && <div className="text-neutral-400 text-sm truncate">{e.location}</div>}
            {Array.isArray(e.tags) && e.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.tags.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="w-32 h-24 rounded-md border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
            {e.imageUrl ? (
              <img
                src={/^https?:\/\//.test(e.imageUrl) ? e.imageUrl : `/images/${e.imageUrl.replace(/^\/+/, '')}`}
                alt={e.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={fallbackFor(e.title, Array.isArray(e.tags) ? e.tags : undefined)}
                alt={e.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}



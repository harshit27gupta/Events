import React from 'react';
import { Link } from 'react-router-dom';

export function EventCard({ e }: { e: any }) {
  return (
    <Link to={`/events/${e._id}`} className="glass p-4 block hover:shadow-lg hover:shadow-black/40 transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-neutral-300 truncate">{new Date(e.date).toLocaleString()}</div>
          <div className="text-lg font-semibold truncate">{e.title}</div>
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.imageUrl} alt={e.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/0" />
          )}
        </div>
      </div>
    </Link>
  );
}



import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type Me = { userId: string; email: string; name?: string; role?: 'user' | 'organizer' | 'admin' } | null;

export function useAuth() {
  const qc = useQueryClient();
  const q = useQuery<Me>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const r = await api.get('/api/auth/me');
        return r.data as Me;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['me'] });
  return { ...q, refresh };
}



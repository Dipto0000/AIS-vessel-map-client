import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Vessel } from '@/types/vessel';
import { fetchVessels } from '@/lib/api';
import { useSocket } from './useSocket';

const VESSELS_KEY = ['vessels'] as const;

export function useVessels() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const query = useQuery({
    queryKey: VESSELS_KEY,
    queryFn: fetchVessels,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!socket) return;

    const handler = (incoming: Vessel) => {
      queryClient.setQueryData<Vessel[]>(VESSELS_KEY, (prev) => {
        if (!prev) return [incoming];
        const idx = prev.findIndex((v) => v.mmsi === incoming.mmsi);
        if (idx === -1) return [...prev, incoming];

        const existing = prev[idx]!;
        const next = prev.slice();

        // Merge incoming data but preserve existing lat/lon when
        // the incoming message is static data (no position)
        next[idx] = {
          ...existing,
          ...incoming,
          latitude: incoming.latitude ?? existing.latitude,
          longitude: incoming.longitude ?? existing.longitude,
        } as Vessel;

        return next;
      });
    };

    socket.on('vessel', handler);
    return () => {
      socket.off('vessel', handler);
    };
  }, [socket, queryClient]);

  return { ...query, isConnected };
}

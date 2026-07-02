// This hook is used to fetch and manage the state of vessels data from the server. It uses React Query for data fetching and caching, and a WebSocket connection to receive real-time updates about vessels.

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
        const next = prev.slice();
        next[idx] = incoming;
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

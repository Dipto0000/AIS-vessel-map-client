import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';
    const s = io(url);
    setSocket(s);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, isConnected };
}

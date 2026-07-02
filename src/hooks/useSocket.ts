// This hook is used to establish a WebSocket connection to the server and manage the connection state. It uses the socket.io-client library to connect to the server and listen for connection and disconnection events.

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = io('/', { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, isConnected };
}

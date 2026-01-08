// Socket hook for managing Socket.IO connection
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@heyhey/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

interface UseSocketReturn {
  socket: TypedSocket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const DEFAULT_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { url = DEFAULT_URL, autoConnect = true } = options;
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(url, {
      autoConnect,
    }) as TypedSocket;

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, autoConnect]);

  const connect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connect,
    disconnect,
  };
}

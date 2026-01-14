// SocketContext - Typed socket.io connection provider
// Auto-connects on mount, handles reconnection, exposes socket instance and connection state

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AllClientToServerEvents, AllServerToClientEvents } from '@heyhey/shared';

/* =============================================================================
   TYPES
   ============================================================================= */

type TypedSocket = Socket<AllServerToClientEvents, AllClientToServerEvents>;

export interface SocketContextValue {
  /** The socket.io socket instance (null if not connected) */
  socket: TypedSocket | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Connection error message if any */
  connectionError: string | null;
  /** Manually disconnect the socket */
  disconnect: () => void;
  /** Manually reconnect the socket */
  reconnect: () => void;
}

/* =============================================================================
   CONTEXT
   ============================================================================= */

const SocketContext = createContext<SocketContextValue | null>(null);

/* =============================================================================
   PROVIDER
   ============================================================================= */

export interface SocketProviderProps {
  /** Server URL (defaults to VITE_SERVER_URL or localhost:3001) */
  serverUrl?: string;
  children: ReactNode;
}

export function SocketProvider({ serverUrl, children }: SocketProviderProps) {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Determine server URL
  const url = serverUrl ?? import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

  // Initialize socket connection
  useEffect(() => {
    const newSocket: TypedSocket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection event handlers
    const onConnect = () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    };

    const onConnectError = (error: Error) => {
      console.error('[Socket] Connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    };

    const onReconnect = (attemptNumber: number) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    };

    const onReconnectAttempt = (attemptNumber: number) => {
      console.log('[Socket] Reconnect attempt:', attemptNumber);
    };

    const onReconnectError = (error: Error) => {
      console.error('[Socket] Reconnect error:', error.message);
    };

    const onReconnectFailed = () => {
      console.error('[Socket] Reconnect failed after max attempts');
      setConnectionError('Failed to reconnect to server');
    };

    // Attach event listeners
    newSocket.on('connect', onConnect);
    newSocket.on('disconnect', onDisconnect);
    newSocket.on('connect_error', onConnectError);
    newSocket.io.on('reconnect', onReconnect);
    newSocket.io.on('reconnect_attempt', onReconnectAttempt);
    newSocket.io.on('reconnect_error', onReconnectError);
    newSocket.io.on('reconnect_failed', onReconnectFailed);

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.off('connect', onConnect);
      newSocket.off('disconnect', onDisconnect);
      newSocket.off('connect_error', onConnectError);
      newSocket.io.off('reconnect', onReconnect);
      newSocket.io.off('reconnect_attempt', onReconnectAttempt);
      newSocket.io.off('reconnect_error', onReconnectError);
      newSocket.io.off('reconnect_failed', onReconnectFailed);
      newSocket.disconnect();
    };
  }, [url]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (socket) {
      socket.connect();
    }
  }, [socket]);

  const value: SocketContextValue = {
    socket,
    isConnected,
    connectionError,
    disconnect,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/* =============================================================================
   HOOK
   ============================================================================= */

/**
 * Hook to access the socket context.
 * Must be used within a SocketProvider.
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
